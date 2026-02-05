import { useEffect, useState, useRef } from 'react';
import Pusher from 'pusher-js';
import axios from 'axios';
import ChatSidebar from '../Components/ChatSidebar';
import ChatWindow from '../Components/ChatWindow';
import AppLayout from '../Layouts/AppLayout';

/**
 * ChatHome — composant principal de la page de chat.
 *
 * Ce composant reçoit ses données initiales depuis Laravel (via Inertia) :
 * - conversations     : la liste des conversations pour la sidebar
 * - activeConversation : la conversation actuellement ouverte (ou null)
 * - messages           : les messages de la conversation ouverte
 * - auth_user          : l'utilisateur connecté
 *
 * Il gère aussi la connexion temps réel avec Pusher pour recevoir
 * les nouveaux messages et les indicateurs de typing en direct.
 */
export default function ChatHome({ conversations, activeConversation, messages, auth_user }) {
    // === ÉTAT LOCAL (state) ===
    const [activeConv, setActiveConv] = useState(activeConversation || null);
    const [msgs, setMsgs] = useState(messages || []);
    const [convList, setConvList] = useState(conversations || []);
    const [typingUsers, setTypingUsers] = useState([]);

    // useRef pour garder l'instance Pusher et l'ID de la conversation active
    // sans déclencher de re-rendu quand ils changent
    const pusherRef = useRef(null);
    const activeConvRef = useRef(activeConv);

    // Garder activeConvRef synchronisé avec activeConv
    // Pour que les callbacks Pusher (qui capturent la ref au moment du bind)
    // aient toujours accès à la valeur courante
    useEffect(() => {
        activeConvRef.current = activeConv;
    }, [activeConv]);

    // === EFFET 1 : Initialiser Pusher (une seule fois) ===
    useEffect(() => {
        if (!auth_user) return;

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        if (!csrfToken) {
            console.error('Meta CSRF token introuvable !');
            return;
        }

        pusherRef.current = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY, {
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
            authEndpoint: '/broadcasting/auth',
            auth: { headers: { 'X-CSRF-TOKEN': csrfToken } },
        });

        // Quand Pusher est connecté, envoyer le Socket ID avec chaque requête axios.
        // C'est ce qui permet à toOthers() côté Laravel de savoir qui est l'émetteur
        // et de NE PAS lui renvoyer son propre message via Pusher.
        // Sans ça, l'émetteur reçoit le message 2 fois (HTTP + WebSocket).
        pusherRef.current.connection.bind('connected', () => {
            axios.defaults.headers.common['X-Socket-ID'] = pusherRef.current.connection.socket_id;
        });

        return () => {
            pusherRef.current?.disconnect();
            pusherRef.current = null;
        };
    }, [auth_user]);

    // === EFFET 2 : S'abonner à TOUTES les conversations pour la sidebar ===
    // Quand un message arrive dans N'IMPORTE quelle conversation,
    // on met à jour le dernier message et le compteur de non-lus dans la sidebar.
    // Si c'est la conversation active, on ajoute aussi le message au chat.
    useEffect(() => {
        if (!pusherRef.current || !convList.length) return;

        const channels = [];

        convList.forEach(conv => {
            const channel = pusherRef.current.subscribe(`private-conversation.${conv.id}`);
            channels.push({ id: conv.id, channel });

            // Écouter les nouveaux messages sur CHAQUE conversation
            channel.bind('App\\Events\\MessageSent', (data) => {
                // Mettre à jour la sidebar : dernier message + compteur non-lus
                setConvList(prev => prev.map(c => {
                    if (c.id !== data.conversation_id) return c;

                    // Si c'est la conversation active → pas de non-lu (on la regarde déjà)
                    const isActive = activeConvRef.current?.id === data.conversation_id;
                    return {
                        ...c,
                        last_message: data.content,
                        unread_count: isActive ? c.unread_count : (c.unread_count || 0) + 1,
                    };
                }));

                // Si le message concerne la conversation ouverte → l'afficher dans le chat
                if (activeConvRef.current?.id === data.conversation_id) {
                    const msgWithUser = {
                        ...data,
                        user: { id: data.user?.id, name: data.user?.name || 'Unknown' },
                    };
                    setMsgs(prev => [...prev, msgWithUser]);
                }
            });

            // Écouter le typing uniquement sur la conversation active
            channel.bind('App\\Events\\Typing', (data) => {
                if (activeConvRef.current?.id === conv.id && data.user_id !== auth_user.id) {
                    setTypingUsers([data.user_name]);
                    setTimeout(() => setTypingUsers([]), 2000);
                }
            });
        });

        // Cleanup : se désabonner de tout quand la liste change
        return () => {
            channels.forEach(({ id, channel }) => {
                channel.unbind_all();
                pusherRef.current?.unsubscribe(`private-conversation.${id}`);
            });
        };
    }, [convList.length, auth_user]); // Se relance si le nombre de conversations change

    /**
     * Charger les messages d'une conversation depuis le serveur.
     * Appelé quand l'utilisateur clique sur une conversation dans la sidebar.
     */
    const loadMessages = async (conversation) => {
        try {
            const res = await axios.get(`/conversations/${conversation.id}/messages`);
            setMsgs(res.data.messages);
        } catch (err) {
            console.error('Erreur chargement messages:', err);
        }
    };

    if (!auth_user) return <div>Chargement...</div>;

    return (
        <AppLayout>
            <div className="flex h-[80vh] border rounded">

                {/* Sidebar : liste des conversations */}
                <ChatSidebar
                    conversations={convList}
                    onSelect={(conv) => {
                        setActiveConv(conv);
                        loadMessages(conv);
                        // Remettre le compteur de non-lus à 0 pour cette conversation
                        setConvList(prev => prev.map(c =>
                            c.id === conv.id ? { ...c, unread_count: 0 } : c
                        ));
                    }}
                />

                {/* Fenêtre de chat : messages + formulaire d'envoi */}
                <ChatWindow
                    conversation={activeConv}
                    messages={msgs}
                    typingUsers={typingUsers}
                    authUser={auth_user}
                    onNewMessage={(msg) => {
                        setMsgs(prev => [...prev, msg]);
                        setConvList(prev =>
                            prev.map(c =>
                                c.id === msg.conversation_id
                                    ? { ...c, last_message: msg.content }
                                    : c
                            )
                        );
                    }}
                />
            </div>
        </AppLayout>
    );
}

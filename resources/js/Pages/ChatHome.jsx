import { useEffect, useState, useRef } from 'react';
import Pusher from 'pusher-js';
import axios from 'axios';
import ChatSidebar from '../Components/ChatSidebar';
import ChatWindow from '../Components/ChatWindow';

/**
 * ChatHome — composant principal (Tailwind pur, design Chatvia).
 *
 * Desktop :
 * ┌──────────┬──────────────────┬──────────────────────────┐
 * │ side-menu│ chat-leftsidebar │       user-chat          │
 * │  75px    │    380px         │      flex-1              │
 * └──────────┴──────────────────┴──────────────────────────┘
 *
 * Mobile :
 * ┌──────────────────┐     ┌──────────────────┐
 * │ Liste des conv   │ ──→ │ ← TopBar         │  (slide-in)
 * │ (pleine largeur) │ ←── │   Messages       │  (slide-out)
 * ├──────────────────┤     │   Input          │
 * │ 🗨  🌙  👤      │     ├──────────────────┤
 * └──────────────────┘     │ 🗨  🌙  👤      │
 *   bottom tab bar         └──────────────────┘
 */
export default function ChatHome({ conversations, activeConversation, messages, auth_user }) {
    const [activeConv, setActiveConv] = useState(activeConversation || null);
    const [msgs, setMsgs] = useState(messages || []);
    const [convList, setConvList] = useState(conversations || []);
    const [typingUsers, setTypingUsers] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    // Mobile : contrôle l'affichage du chat (slide-in/out)
    const [mobileShowChat, setMobileShowChat] = useState(false);

    const pusherRef = useRef(null);
    const activeConvRef = useRef(activeConv);

    useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

    // Dark mode
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    // Fermer dropdown au clic extérieur
    useEffect(() => {
        if (!dropdownOpen) return;
        const close = () => setDropdownOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [dropdownOpen]);

    // === Pusher init ===
    useEffect(() => {
        if (!auth_user) return;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        if (!csrfToken) return;

        pusherRef.current = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY, {
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
            authEndpoint: '/broadcasting/auth',
            auth: { headers: { 'X-CSRF-TOKEN': csrfToken } },
        });

        pusherRef.current.connection.bind('connected', () => {
            axios.defaults.headers.common['X-Socket-ID'] = pusherRef.current.connection.socket_id;
        });

        return () => { pusherRef.current?.disconnect(); pusherRef.current = null; };
    }, [auth_user]);

    // === S'abonner à TOUTES les conversations ===
    useEffect(() => {
        if (!pusherRef.current || !convList.length) return;
        const channels = [];

        convList.forEach(conv => {
            const channel = pusherRef.current.subscribe(`private-conversation.${conv.id}`);
            channels.push({ id: conv.id, channel });

            channel.bind('App\\Events\\MessageSent', (data) => {
                setConvList(prev => prev.map(c => {
                    if (c.id !== data.conversation_id) return c;
                    const isActive = activeConvRef.current?.id === data.conversation_id;
                    return {
                        ...c,
                        last_message: data.content,
                        unread_count: isActive ? c.unread_count : (c.unread_count || 0) + 1,
                    };
                }));
                if (activeConvRef.current?.id === data.conversation_id) {
                    setMsgs(prev => [...prev, {
                        ...data,
                        user: { id: data.user?.id, name: data.user?.name || 'Unknown' },
                    }]);
                }
            });

            channel.bind('App\\Events\\Typing', (data) => {
                if (activeConvRef.current?.id === conv.id && data.user_id !== auth_user.id) {
                    setTypingUsers([data.user_name]);
                    setTimeout(() => setTypingUsers([]), 2000);
                }
            });
        });

        return () => {
            channels.forEach(({ id, channel }) => {
                channel.unbind_all();
                pusherRef.current?.unsubscribe(`private-conversation.${id}`);
            });
        };
    }, [convList.length, auth_user]);

    const loadMessages = async (conversation) => {
        try {
            const res = await axios.get(`/conversations/${conversation.id}/messages`);
            setMsgs(res.data.messages);
        } catch (err) {
            console.error('Erreur chargement messages:', err);
        }
    };

    const handleLogout = (e) => {
        e.preventDefault();
        e.stopPropagation();
        axios.post('/logout').then(() => { window.location.href = '/login'; });
    };

    // Sélectionner une conversation (+ ouvrir le chat sur mobile)
    const handleSelectConv = (conv) => {
        setActiveConv(conv);
        loadMessages(conv);
        setConvList(prev => prev.map(c =>
            c.id === conv.id ? { ...c, unread_count: 0 } : c
        ));
        setMobileShowChat(true);
    };

    // Retour à la liste (mobile)
    const handleBack = () => {
        setMobileShowChat(false);
    };

    if (!auth_user) return <div className="flex items-center justify-center h-screen text-chatvia-muted">Chargement...</div>;

    const userInitials = (auth_user.name || '?')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex h-screen bg-white dark:bg-chatvia-dark-bg overflow-hidden">

            {/* ====== SIDE MENU — Desktop: colonne gauche 75px | Mobile: barre en bas 60px ====== */}
            <div className={`
                fixed bottom-0 left-0 right-0 z-40 h-[60px] border-t border-gray-200 dark:border-gray-700
                bg-chatvia-sidebar dark:bg-chatvia-sidebar-dark
                flex items-center justify-around
                lg:static lg:h-auto lg:w-sidebar lg:min-w-sidebar lg:flex-col lg:items-center
                lg:border-t-0 lg:border-r lg:justify-start
            `}>
                {/* Logo — desktop seulement */}
                <div className="hidden lg:block py-5">
                    <a href="/">
                        <img src="/chatvia/images/logo-dark.png" alt="Logo" className="h-7 dark:hidden" />
                        <img src="/chatvia/images/logo-light.png" alt="Logo" className="h-7 hidden dark:block" />
                    </a>
                </div>

                {/* Icônes — horizontales mobile, verticales desktop */}
                <nav className="flex items-center gap-1 lg:flex-1 lg:flex-col lg:gap-2 lg:mt-4">
                    {/* Chat */}
                    <button className="w-12 h-12 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center bg-chatvia-primary/10 text-chatvia-primary">
                        <i className="ri-message-3-line text-xl"></i>
                    </button>

                    {/* Dark/Light Mode */}
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="w-12 h-12 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center text-chatvia-muted hover:text-chatvia-primary hover:bg-chatvia-primary/10 transition-colors"
                    >
                        <i className={`text-xl ${darkMode ? 'ri-sun-line' : 'ri-moon-clear-line'}`}></i>
                    </button>
                </nav>

                {/* Avatar + Logout */}
                <div className="relative lg:pb-5">
                    <button
                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                        className="w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-chatvia-primary text-white flex items-center justify-center text-xs font-semibold"
                    >
                        {userInitials}
                    </button>

                    {dropdownOpen && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-white dark:bg-chatvia-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                            <a
                                href="#"
                                onClick={handleLogout}
                                className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-chatvia-dark"
                            >
                                Déconnexion
                                <i className="ri-logout-circle-r-line text-chatvia-muted"></i>
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* ====== CHAT SIDEBAR — Desktop: 380px | Mobile: pleine largeur ====== */}
            <ChatSidebar
                conversations={convList}
                authUser={auth_user}
                activeConv={activeConv}
                onSelect={handleSelectConv}
            />

            {/* ====== ZONE DE CHAT — Desktop: flex-1 visible | Mobile: overlay slide-in ====== */}
            <ChatWindow
                conversation={activeConv}
                messages={msgs}
                typingUsers={typingUsers}
                authUser={auth_user}
                mobileShow={mobileShowChat}
                onBack={handleBack}
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
    );
}

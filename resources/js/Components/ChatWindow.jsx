import React, { useRef, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import ChatTopBar from './ChatTopBar';

/**
 * ChatWindow — la fenêtre de chat principale (partie droite de l'écran).
 *
 * Affiche :
 * - La barre supérieure (ChatTopBar) avec le nom de l'autre utilisateur
 * - La liste des messages (mes messages à droite en bleu, les autres à gauche en gris)
 * - L'indicateur "est en train d'écrire..."
 * - Le formulaire d'envoi de message
 *
 * Props reçues du parent (ChatHome) :
 * - conversation : la conversation ouverte
 * - messages     : la liste des messages à afficher
 * - typingUsers  : les noms des utilisateurs qui tapent
 * - authUser     : l'utilisateur connecté (moi)
 * - onNewMessage : fonction à appeler quand j'envoie un message
 * - onBack       : fonction pour revenir à la liste (mobile)
 */
export default function ChatWindow({ conversation, messages, typingUsers, authUser, onNewMessage, onBack }) {
    // Référence vers un div invisible en bas de la liste → permet de scroller automatiquement
    const scrollRef = useRef();
    // Le texte en cours de saisie dans l'input
    const [content, setContent] = useState('');
    // Timer pour le throttle du typing (limite à 1 requête par seconde)
    const typingTimerRef = useRef(null);

    // Scroll automatique vers le bas à chaque nouveau message
    // useEffect se relance à chaque changement de la liste "messages"
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /**
     * Envoyer un message quand le formulaire est soumis.
     * 1. Empêche le rechargement de la page (e.preventDefault)
     * 2. Vérifie que le message n'est pas vide
     * 3. Envoie le message au serveur via POST /messages/send
     * 4. Ajoute le message localement via onNewMessage (pas besoin d'attendre Pusher)
     * 5. Vide le champ de saisie
     */
    const handleSend = async (e) => {
        e.preventDefault(); // Empêcher le rechargement de la page
        if (!content.trim() || !conversation) return; // Message vide → ne rien faire

        try {
            // Envoyer le message au serveur Laravel
            const res = await axios.post('/messages/send', {
                conversation_id: conversation.id,
                content: content.trim(), // Supprimer les espaces avant/après
            });

            // Informer le parent (ChatHome) du nouveau message pour l'afficher
            if (onNewMessage) onNewMessage(res.data.message);
            setContent(''); // Vider le champ de saisie
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * Envoyer l'indicateur "est en train d'écrire" avec un throttle.
     *
     * Throttle = limiter à 1 requête maximum par seconde.
     * Sans ça, chaque touche du clavier enverrait une requête HTTP
     * (taper "bonjour" = 7 requêtes → surcharge inutile du serveur).
     *
     * Fonctionnement :
     * 1. Si un timer est déjà en cours → ne rien faire (on a déjà envoyé récemment)
     * 2. Sinon → envoyer la requête et démarrer un timer de 1 seconde
     * 3. Quand le timer expire → permettre un nouvel envoi
     *
     * useCallback = mémoriser la fonction pour éviter de la recréer à chaque rendu
     */
    const handleTyping = useCallback(() => {
        if (!conversation || typingTimerRef.current) return; // Timer actif → ignorer

        // Démarrer un timer : pendant 1s, les prochains appels seront ignorés
        typingTimerRef.current = setTimeout(() => {
            typingTimerRef.current = null; // Timer expiré → autoriser un nouvel envoi
        }, 1000);

        // Envoyer la requête POST /typing au serveur
        // .catch(() => {}) = ignorer silencieusement les erreurs (c'est pas grave si ça échoue)
        axios.post('/typing', { conversation_id: conversation.id }).catch(() => {});
    }, [conversation]);

    // Nettoyer le timer quand le composant est détruit (éviter les fuites mémoire)
    useEffect(() => {
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, []);

    // Écran de chargement si l'utilisateur n'est pas encore disponible
    if (!authUser) return <div>Chargement...</div>;

    return (
        <div className="w-2/3 flex flex-col border-l">
            {/* Barre supérieure : nom de l'autre utilisateur + bouton retour */}
            <ChatTopBar
                conversation={conversation}
                authUser={authUser}
                onBack={onBack}
            />

            {/* Zone des messages (scrollable) */}
            <div className="flex-1 flex flex-col p-2 overflow-y-auto">
                {/* Boucle sur chaque message pour l'afficher */}
                {messages.map(msg => (
                    <div
                        key={msg.id} // Clé unique pour React (obligatoire dans les boucles)
                        // Si c'est MON message → aligné à droite, sinon à gauche
                        className={`mb-2 ${msg.user_id === authUser.id ? 'text-right' : 'text-left'}`}
                    >
                        <div className={`inline-block px-3 py-1 rounded-lg ${
                            msg.user_id === authUser.id ? 'bg-blue-200' : 'bg-gray-200'
                        }`}>
                            {/* Nom de l'auteur en gras */}
                            <span className="font-bold">{msg.user?.name || 'Unknown'}: </span>
                            {/* Contenu du message */}
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Indicateur de typing : affiché quand quelqu'un tape */}
                {typingUsers.length > 0 && (
                    <div className="text-gray-500 text-sm">
                        {typingUsers.join(', ')} est en train d'écrire...
                    </div>
                )}

                {/* Div invisible en bas → cible du scroll automatique */}
                <div ref={scrollRef}></div>
            </div>

            {/* Formulaire d'envoi de message (affiché seulement si une conversation est ouverte) */}
            {conversation && (
                <form className="flex p-2 border-t" onSubmit={handleSend}>
                    <input
                        type="text"
                        className="flex-1 border rounded px-2 py-1"
                        placeholder="Tapez un message..."
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);  // Mettre à jour le texte saisi
                            handleTyping();               // Envoyer l'indicateur de typing (throttlé)
                        }}
                    />
                    <button
                        type="submit"
                        className="ml-2 bg-blue-500 text-white px-4 rounded hover:bg-blue-600 transition"
                    >
                        Envoyer
                    </button>
                </form>
            )}
        </div>
    );
}

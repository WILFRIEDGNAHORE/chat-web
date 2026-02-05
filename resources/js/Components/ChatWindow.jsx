import React, { useRef, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import ChatTopBar from './ChatTopBar';

/**
 * ChatWindow — zone de chat (Tailwind pur, design Chatvia).
 *
 * Desktop : flex-1 visible en permanence à droite.
 * Mobile  : overlay plein écran, glisse depuis la droite (translate-x).
 */
export default function ChatWindow({ conversation, messages, typingUsers, authUser, onNewMessage, mobileShow, onBack }) {
    const scrollRef = useRef();
    const [content, setContent] = useState('');
    const typingTimerRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!content.trim() || !conversation) return;
        try {
            const res = await axios.post('/messages/send', {
                conversation_id: conversation.id,
                content: content.trim(),
            });
            if (onNewMessage) onNewMessage(res.data.message);
            setContent('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleTyping = useCallback(() => {
        if (!conversation || typingTimerRef.current) return;
        typingTimerRef.current = setTimeout(() => { typingTimerRef.current = null; }, 1000);
        axios.post('/typing', { conversation_id: conversation.id }).catch(() => {});
    }, [conversation]);

    useEffect(() => {
        return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
    }, []);

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name) =>
        (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    if (!authUser) return <div className="flex-1 flex items-center justify-center text-chatvia-muted">Chargement...</div>;

    // Écran d'accueil (desktop seulement — sur mobile la sidebar est visible)
    if (!conversation) {
        return (
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center h-full text-chatvia-muted bg-white dark:bg-chatvia-dark-bg">
                <i className="ri-chat-3-line text-6xl mb-4"></i>
                <h5 className="text-lg font-medium text-gray-500 dark:text-gray-400">Sélectionnez une conversation</h5>
                <p className="text-sm mt-1">Choisissez un contact dans la liste pour commencer</p>
            </div>
        );
    }

    return (
        <div className={`
            fixed inset-0 z-50 bg-white dark:bg-chatvia-dark-bg
            flex flex-col
            transition-transform duration-300 ease-in-out
            ${mobileShow ? 'translate-x-0' : 'translate-x-full'}
            lg:static lg:translate-x-0 lg:z-auto lg:flex-1
        `}>

            {/* Top bar avec bouton retour sur mobile */}
            <ChatTopBar conversation={conversation} authUser={authUser} onBack={onBack} />

            {/* Zone des messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 pb-[60px] lg:pb-4">
                {messages.map((msg, index) => {
                    const isMine = msg.user_id === authUser.id;
                    const senderName = msg.user?.name || 'Unknown';

                    return (
                        <div key={msg.id || index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-2.5 max-w-[75%] ${isMine ? 'flex-row-reverse' : ''}`}>

                                {!isMine && (
                                    <div className="w-8 h-8 rounded-full bg-chatvia-info text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-5">
                                        {getInitials(senderName)}
                                    </div>
                                )}

                                <div>
                                    <p className={`text-xs text-chatvia-muted mb-1 ${isMine ? 'text-right' : ''}`}>
                                        {isMine ? 'Vous' : senderName}
                                    </p>

                                    <div className={`
                                        inline-block px-4 py-2.5 rounded-lg
                                        ${isMine
                                            ? 'bg-chatvia-primary text-white rounded-br-none'
                                            : 'bg-chatvia-sidebar dark:bg-chatvia-dark text-gray-800 dark:text-gray-200 rounded-bl-none'
                                        }
                                    `}>
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-chatvia-muted'}`}>
                                            <i className="ri-time-line mr-0.5"></i>
                                            {formatTime(msg.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                        <div className="flex gap-2.5 max-w-[75%]">
                            <div className="w-8 h-8 rounded-full bg-chatvia-info text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                                {getInitials(typingUsers[0])}
                            </div>
                            <div className="bg-chatvia-sidebar dark:bg-chatvia-dark px-4 py-3 rounded-lg rounded-bl-none">
                                <div className="flex items-center gap-1">
                                    <span className="animate-dot w-1.5 h-1.5 rounded-full bg-chatvia-muted" style={{ animationDelay: '0s' }}></span>
                                    <span className="animate-dot w-1.5 h-1.5 rounded-full bg-chatvia-muted" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="animate-dot w-1.5 h-1.5 rounded-full bg-chatvia-muted" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={scrollRef}></div>
            </div>

            {/* Zone d'envoi — mb-[60px] sur mobile pour la tab bar */}
            <div className="px-4 lg:px-6 py-3 mb-[60px] lg:mb-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-chatvia-sidebar-dark">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-chatvia-sidebar dark:bg-chatvia-dark border-none rounded-lg px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-chatvia-muted focus:outline-none focus:ring-2 focus:ring-chatvia-primary/30"
                        placeholder="Tapez un message..."
                        value={content}
                        onChange={(e) => { setContent(e.target.value); handleTyping(); }}
                    />
                    <button
                        type="submit"
                        className="w-10 h-10 rounded-lg bg-chatvia-primary text-white flex items-center justify-center hover:bg-chatvia-primary-hover transition-colors flex-shrink-0"
                    >
                        <i className="ri-send-plane-2-fill text-lg"></i>
                    </button>
                </form>
            </div>
        </div>
    );
}

import React, { useState } from 'react';

/**
 * ChatSidebar — liste des conversations (Tailwind pur, design Chatvia).
 * Largeur 380px sur desktop, pleine largeur sur mobile.
 */
export default function ChatSidebar({ conversations, authUser, activeConv, onSelect }) {
    const [search, setSearch] = useState('');

    const filtered = conversations.filter(conv =>
        conv.title?.toLowerCase().includes(search.toLowerCase())
    );

    const getInitials = (name) =>
        (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const avatarColors = ['bg-chatvia-primary', 'bg-chatvia-info', 'bg-chatvia-success', 'bg-chatvia-warning', 'bg-chatvia-danger', 'bg-gray-500'];
    const getColorClass = (id) => avatarColors[id % avatarColors.length];

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="w-full lg:w-chatlist lg:min-w-chatlist lg:max-w-chatlist border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-chatvia-sidebar-dark flex flex-col h-full pb-[60px] lg:pb-0">

            {/* En-tête + recherche */}
            <div className="px-5 pt-5 pb-3">
                <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Chats</h4>

                <div className="flex items-center bg-chatvia-sidebar dark:bg-chatvia-dark rounded-lg px-3 py-2">
                    <i className="ri-search-line text-chatvia-muted mr-2"></i>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-chatvia-muted"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Label */}
            <div className="px-5 pb-2">
                <p className="text-xs font-medium uppercase tracking-wider text-chatvia-muted">Récentes</p>
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto px-2">
                <ul className="space-y-0.5">
                    {filtered.map(conv => {
                        const isActive = activeConv?.id === conv.id;
                        const otherUser = conv.users?.find(u => u.id !== authUser?.id);
                        const displayName = conv.title || otherUser?.name || 'Conversation';

                        return (
                            <li
                                key={conv.id}
                                onClick={() => onSelect(conv)}
                                className={`
                                    flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors
                                    ${isActive
                                        ? 'bg-chatvia-primary/10 dark:bg-chatvia-primary/20'
                                        : 'hover:bg-gray-50 dark:hover:bg-chatvia-dark'
                                    }
                                `}
                            >
                                {/* Avatar */}
                                <div className={`
                                    w-9 h-9 rounded-full flex items-center justify-center
                                    text-white text-xs font-semibold flex-shrink-0
                                    ${getColorClass(conv.id)}
                                `}>
                                    {getInitials(displayName)}
                                </div>

                                {/* Nom + dernier message */}
                                <div className="flex-1 min-w-0">
                                    <h5 className={`text-sm truncate ${
                                        isActive ? 'text-chatvia-primary font-semibold' : 'text-gray-800 dark:text-gray-200 font-medium'
                                    }`}>
                                        {displayName}
                                    </h5>
                                    <p className={`text-xs truncate mt-0.5 ${
                                        conv.unread_count > 0
                                            ? 'text-gray-700 dark:text-gray-300 font-semibold'
                                            : 'text-chatvia-muted'
                                    }`}>
                                        {conv.last_message || 'Aucun message'}
                                    </p>
                                </div>

                                {/* Heure + badge non-lus */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-[10px] text-chatvia-muted">
                                        {formatTime(conv.last_message_time)}
                                    </span>
                                    {conv.unread_count > 0 && (
                                        <span className="bg-chatvia-danger text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                        </span>
                                    )}
                                </div>
                            </li>
                        );
                    })}

                    {filtered.length === 0 && (
                        <li className="flex flex-col items-center justify-center py-10 text-chatvia-muted">
                            <i className="ri-chat-3-line text-4xl mb-2"></i>
                            <p className="text-sm">Aucune conversation</p>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}

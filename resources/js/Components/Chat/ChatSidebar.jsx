import { router } from '@inertiajs/react';
import { Search, MessageCircle } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function ChatSidebar({ conversations, selectedId, onSelect, currentUserId }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return conversations;
        const term = search.toLowerCase();
        return conversations.filter(c => {
            const otherUser = c.other_user;
            return otherUser?.name?.toLowerCase().includes(term) ||
                   c.btp_request?.title?.toLowerCase().includes(term);
        });
    }, [conversations, search]);

    const handleSelect = (conversationId) => {
        onSelect(conversationId);
        router.visit(`/chat/${conversationId}`, { preserveState: true, preserveScroll: true });
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return "À l'instant";
        if (diffMin < 60) return `${diffMin} min`;
        if (diffHour < 24) return `${diffHour} h`;
        if (diffDay < 7) return `${diffDay} j`;
        return time.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                    Messagerie
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher une conversation..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="p-6 text-center">
                        <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">
                            {search ? 'Aucune conversation trouvée' : 'Aucune conversation'}
                        </p>
                    </div>
                ) : (
                    filtered.map(conversation => (
                        <button
                            key={conversation.id}
                            onClick={() => handleSelect(conversation.id)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                                selectedId === conversation.id
                                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                    : ''
                            }`}
                        >
                            {/* Avatar */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <span className="text-white text-sm font-bold">
                                    {getInitials(conversation.other_user?.name)}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-gray-900 text-sm truncate">
                                        {conversation.other_user?.name || 'Utilisateur'}
                                    </span>
                                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                        {formatTimeAgo(conversation.latest_message?.created_at)}
                                    </span>
                                </div>

                                {/* BTP Request context */}
                                {conversation.btp_request && (
                                    <p className="text-xs text-blue-600 truncate mb-0.5 font-medium">
                                        {conversation.btp_request.title}
                                    </p>
                                )}

                                {/* Last message preview */}
                                <p className="text-sm text-gray-500 truncate">
                                    {conversation.latest_message?.user_id === currentUserId && (
                                        <span className="text-gray-400">Vous: </span>
                                    )}
                                    {conversation.latest_message?.content || 'Commencez la conversation'}
                                </p>
                            </div>

                            {/* Unread badge */}
                            {conversation.unread_count > 0 && (
                                <span className="bg-blue-500 text-white text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-bold flex-shrink-0">
                                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                                </span>
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

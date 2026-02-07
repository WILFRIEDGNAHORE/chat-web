import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import useChat from '@/hooks/useChat';

export default function ChatWindow({ conversationId, conversation, currentUser, onBack, isMobile }) {
    const { messages, loading, error, typingUsers, sendMessage, sendTyping } = useChat(conversationId);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on mount
    useEffect(() => {
        if (!isMobile) {
            inputRef.current?.focus();
        }
    }, [conversationId, isMobile]);

    const handleSend = async (e) => {
        e.preventDefault();
        const content = input.trim();
        if (!content || sending) return;

        setSending(true);
        setInput('');

        try {
            await sendMessage(content);
        } catch (err) {
            console.error('Failed to send message:', err);
            setInput(content); // Restore input on error
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        sendTyping();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Aujourd'hui";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Hier';
        }
        return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, message) => {
        const date = new Date(message.created_at).toDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(message);
        return groups;
    }, {});

    const otherUser = conversation?.other_user;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm">
                {isMobile && (
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                )}

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm font-bold">
                        {getInitials(otherUser?.name)}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                        {otherUser?.name || 'Conversation'}
                    </p>
                    {typingUsers.length > 0 ? (
                        <p className="text-xs text-blue-500 animate-pulse">
                            {typingUsers.map(u => u.user_name).join(', ')} est en train d'écrire...
                        </p>
                    ) : conversation?.btp_request ? (
                        <p className="text-xs text-gray-500 truncate">
                            {conversation.btp_request.title}
                        </p>
                    ) : null}
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-500">
                        {error}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="bg-gray-100 rounded-full p-4 mb-3">
                            <Send className="w-8 h-8" />
                        </div>
                        <p className="text-sm">Commencez la conversation</p>
                        <p className="text-xs mt-1">Envoyez votre premier message</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedMessages).map(([date, dayMessages]) => (
                            <div key={date}>
                                {/* Date separator */}
                                <div className="flex items-center justify-center my-4">
                                    <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                                        {formatDate(dayMessages[0].created_at)}
                                    </span>
                                </div>

                                {/* Messages for this day */}
                                <div className="space-y-2">
                                    {dayMessages.map((msg, index) => {
                                        const isOwn = msg.user_id === currentUser.id;
                                        const showAvatar = !isOwn && (
                                            index === 0 ||
                                            dayMessages[index - 1]?.user_id !== msg.user_id
                                        );

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {!isOwn && (
                                                    <div className="w-8 mr-2 flex-shrink-0">
                                                        {showAvatar && (
                                                            <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-full w-8 h-8 flex items-center justify-center">
                                                                <span className="text-white text-xs font-bold">
                                                                    {getInitials(msg.user?.name)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div
                                                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                                        isOwn
                                                            ? 'bg-blue-500 text-white rounded-br-md'
                                                            : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md'
                                                    }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap break-words">
                                                        {msg.content}
                                                    </p>
                                                    <p className={`text-[10px] mt-1 text-right ${
                                                        isOwn ? 'text-blue-100' : 'text-gray-400'
                                                    }`}>
                                                        {formatTime(msg.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 pl-10">
                        <div className="bg-gray-200 rounded-2xl px-4 py-2">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input area */}
            <form onSubmit={handleSend} className="p-3 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Écrivez un message..."
                        className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || sending}
                        className="bg-blue-500 text-white rounded-full p-2.5 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

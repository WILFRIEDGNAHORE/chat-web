import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Loader2, ArrowDown, MessageCircle, Search, X, Check, CheckCheck } from 'lucide-react';
import useChat from '@/hooks/useChat';
import usePresence from '@/hooks/usePresence';
import MessageSkeleton from './MessageSkeleton';
import MessageContent from './MessageContent';
import MessageActions from './MessageActions';
import FileUploadButton from './FileUploadButton';
import EmojiPicker from './EmojiPicker';
import SearchMessages from './SearchMessages';

export default function ChatWindow({ conversationId, conversation, currentUser, onBack, isMobile }) {
    const {
        messages, loading, error, typingUsers, replyingTo, setReplyingTo,
        readReceipts, sendMessage, deleteMessage, markAsRead, sendTyping,
    } = useChat(conversationId, currentUser);
    const { isOnline } = usePresence();

    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFileType, setSelectedFileType] = useState(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const draftTimeoutRef = useRef(null);
    const observerRef = useRef(null);

    const otherUser = conversation?.other_user;
    const otherUserOnline = otherUser ? isOnline(otherUser.id) : false;

    // Auto-scroll to bottom on new messages (only if near bottom)
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 150) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Focus input on mount (desktop only)
    useEffect(() => {
        if (!isMobile) inputRef.current?.focus();
    }, [conversationId, isMobile]);

    // Load draft from localStorage
    useEffect(() => {
        if (!conversationId) return;
        const draft = localStorage.getItem(`chat_draft_${conversationId}`);
        setInput(draft || '');
    }, [conversationId]);

    // Save draft with debounce
    useEffect(() => {
        if (!conversationId) return;
        if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);

        draftTimeoutRef.current = setTimeout(() => {
            if (input.trim()) {
                localStorage.setItem(`chat_draft_${conversationId}`, input);
            } else {
                localStorage.removeItem(`chat_draft_${conversationId}`);
            }
        }, 500);

        return () => { if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current); };
    }, [input, conversationId]);

    // IntersectionObserver for read receipts
    useEffect(() => {
        if (!currentUser || loading) return;

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const msgId = entry.target.dataset.messageId;
                    const msgUserId = entry.target.dataset.userId;
                    if (msgUserId && msgUserId !== currentUser.id) {
                        markAsRead(msgId);
                    }
                    observerRef.current?.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        return () => observerRef.current?.disconnect();
    }, [currentUser, loading, markAsRead]);

    // Observe new message elements
    useEffect(() => {
        if (!observerRef.current) return;
        const container = messagesContainerRef.current;
        if (!container) return;

        const elements = container.querySelectorAll('[data-message-id]');
        elements.forEach(el => observerRef.current?.observe(el));
    }, [messages]);

    // Auto-resize textarea
    const adjustTextareaHeight = useCallback(() => {
        const textarea = inputRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }, []);

    useEffect(() => { adjustTextareaHeight(); }, [input, adjustTextareaHeight]);

    // Scroll tracking
    const handleScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
    }, []);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const scrollToMessage = (msgId) => {
        const el = document.getElementById(`message-${msgId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-yellow-100');
            setTimeout(() => el.classList.remove('bg-yellow-100'), 2000);
        }
    };

    // File handling
    const handleFileSelect = (file, type) => {
        setSelectedFile(file);
        setSelectedFileType(type);
        if (type === 'image') {
            setFilePreviewUrl(URL.createObjectURL(file));
        } else {
            setFilePreviewUrl(null);
        }
    };

    const clearFile = () => {
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        setSelectedFile(null);
        setSelectedFileType(null);
        setFilePreviewUrl(null);
    };

    // Emoji handling
    const handleEmojiSelect = (emoji) => {
        const textarea = inputRef.current;
        if (!textarea) {
            setInput(prev => prev + emoji);
            return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = input.substring(0, start) + emoji + input.substring(end);
        setInput(newValue);
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
            textarea.focus();
        }, 0);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const content = input.trim();
        if ((!content && !selectedFile) || sending) return;

        setSending(true);
        setInput('');
        localStorage.removeItem(`chat_draft_${conversationId}`);
        if (inputRef.current) inputRef.current.style.height = 'auto';

        const fileToSend = selectedFile;
        const fileTypeToSend = selectedFileType;
        clearFile();

        try {
            await sendMessage(content || null, fileToSend, fileTypeToSend);
        } catch (err) {
            console.error('Failed to send message:', err);
            if (content) setInput(content);
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
        if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
        if (date.toDateString() === yesterday.toDateString()) return 'Hier';
        return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' o';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
        return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, message) => {
        const date = new Date(message.created_at).toDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(message);
        return groups;
    }, {});

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm">
                {isMobile && (
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                )}

                <div className="relative">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
                        <span className="text-white text-sm font-bold">{getInitials(otherUser?.name)}</span>
                    </div>
                    {otherUserOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{otherUser?.name || 'Conversation'}</p>
                    {typingUsers.length > 0 ? (
                        <p className="text-xs text-blue-500 animate-pulse">
                            {typingUsers.map(u => u.user_name).join(', ')} est en train d'écrire...
                        </p>
                    ) : otherUserOnline ? (
                        <p className="text-xs text-green-500">En ligne</p>
                    ) : conversation?.btp_request ? (
                        <p className="text-xs text-gray-500 truncate">{conversation.btp_request.title}</p>
                    ) : null}
                </div>

                <button
                    onClick={() => setShowSearch(true)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Search className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Search overlay */}
            {showSearch && (
                <SearchMessages
                    conversationId={conversationId}
                    onClose={() => setShowSearch(false)}
                    onScrollToMessage={scrollToMessage}
                />
            )}

            {/* Messages area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 bg-gray-50 relative"
            >
                {loading ? (
                    <MessageSkeleton />
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-500">{error}</div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-full p-6 mb-4">
                            <MessageCircle className="w-10 h-10 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">Commencez la conversation</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Dites bonjour à {otherUser?.name || 'votre interlocuteur'}
                        </p>
                        <button onClick={() => inputRef.current?.focus()} className="text-blue-600 text-sm font-medium hover:underline">
                            Écrire un message
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedMessages).map(([date, dayMessages]) => (
                            <div key={date}>
                                <div className="flex items-center justify-center my-4">
                                    <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                                        {formatDate(dayMessages[0].created_at)}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {dayMessages.map((msg, index) => {
                                        const isOwn = msg.user_id === currentUser.id;
                                        const showAvatar = !isOwn && (
                                            index === 0 || dayMessages[index - 1]?.user_id !== msg.user_id
                                        );
                                        const isRead = readReceipts[msg.id];

                                        return (
                                            <div
                                                key={msg.id}
                                                id={`message-${msg.id}`}
                                                data-message-id={msg.id}
                                                data-user-id={msg.user_id}
                                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group animate-slide-up transition-colors duration-500`}
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

                                                <div className="flex items-end gap-1 max-w-[75%]">
                                                    {isOwn && !msg.deleted_at && (
                                                        <MessageActions
                                                            message={msg}
                                                            isOwn={isOwn}
                                                            onReply={(m) => { setReplyingTo(m); inputRef.current?.focus(); }}
                                                            onDelete={deleteMessage}
                                                        />
                                                    )}

                                                    <div
                                                        className={`rounded-2xl px-4 py-2 ${
                                                            msg.deleted_at
                                                                ? 'bg-gray-100 border border-gray-200'
                                                                : isOwn
                                                                    ? 'bg-blue-500 text-white rounded-br-md'
                                                                    : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md'
                                                        } ${msg.sending ? 'opacity-70' : ''}`}
                                                    >
                                                        {/* Reply preview */}
                                                        {msg.reply_to && !msg.deleted_at && (
                                                            <div
                                                                className={`border-l-2 pl-2 mb-2 text-xs cursor-pointer ${
                                                                    isOwn ? 'border-blue-300 text-blue-100' : 'border-blue-400 text-gray-500'
                                                                }`}
                                                                onClick={() => scrollToMessage(msg.reply_to.id)}
                                                            >
                                                                <p className="font-medium truncate">{msg.reply_to.content}</p>
                                                            </div>
                                                        )}

                                                        <MessageContent message={msg} isOwn={isOwn} />

                                                        <div className="flex items-center gap-1 justify-end mt-1">
                                                            <p className={`text-[10px] ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                                                                {formatTime(msg.created_at)}
                                                            </p>
                                                            {msg.sending && (
                                                                <Loader2 className="w-3 h-3 animate-spin text-blue-200" />
                                                            )}
                                                            {isOwn && !msg.sending && !msg.deleted_at && (
                                                                isRead ? (
                                                                    <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                                                ) : (
                                                                    <Check className="w-3 h-3 text-blue-200" />
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    {!isOwn && !msg.deleted_at && (
                                                        <MessageActions
                                                            message={msg}
                                                            isOwn={isOwn}
                                                            onReply={(m) => { setReplyingTo(m); inputRef.current?.focus(); }}
                                                            onDelete={deleteMessage}
                                                        />
                                                    )}
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

                {/* Scroll to bottom button */}
                {showScrollButton && (
                    <button
                        onClick={scrollToBottom}
                        className="sticky bottom-4 left-full -ml-14 bg-white text-gray-600 rounded-full p-2.5 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowDown className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Bottom sticky area */}
            <div className="sticky bottom-0 z-10 bg-white">
                {/* Reply bar */}
                {replyingTo && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
                        <div className="flex-1 border-l-2 border-blue-500 pl-3 min-w-0">
                            <p className="text-xs text-blue-600 font-medium">
                                Répondre à {replyingTo.user?.name || 'message'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded-full">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                )}

                {/* File preview */}
                {selectedFile && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
                        {filePreviewUrl ? (
                            <img src={filePreviewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <span className="text-xs text-gray-500 font-medium">
                                    {selectedFile.name.split('.').pop()?.toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button onClick={clearFile} className="p-1.5 hover:bg-gray-200 rounded-full">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                )}

                {/* Input area */}
                <form onSubmit={handleSend} className="p-3 border-t border-gray-200 bg-white">
                <div className="flex items-end gap-1">
                    <FileUploadButton onFileSelect={handleFileSelect} disabled={sending} />
                    <EmojiPicker onSelect={handleEmojiSelect} disabled={sending} />

                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Écrivez un message..."
                            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none overflow-hidden"
                            style={{ maxHeight: '120px' }}
                            disabled={sending}
                            maxLength={5000}
                        />
                        {input.length > 4500 && (
                            <span className={`absolute bottom-1.5 right-3 text-[10px] ${
                                input.length > 4950 ? 'text-red-600 font-semibold' :
                                input.length > 4800 ? 'text-orange-500' : 'text-gray-400'
                            }`}>
                                {input.length}/5000
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={(!input.trim() && !selectedFile) || sending}
                        className="bg-blue-500 text-white rounded-full p-2.5 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex-shrink-0"
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
        </div>
    );
}

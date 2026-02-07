import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export default function useChat(conversationId, currentUser = null) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typingUsers, setTypingUsers] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [readReceipts, setReadReceipts] = useState({});
    const typingTimeoutRef = useRef({});
    const typingThrottleRef = useRef(null);

    const fetchMessages = useCallback(async () => {
        if (!conversationId) return;

        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`/api/chat/${conversationId}/messages`);
            const messagesData = response.data.data || [];
            setMessages(messagesData);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
            setError('Erreur lors du chargement des messages');
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    const sendMessage = useCallback(async (content, file = null, fileType = null) => {
        if (!conversationId) return null;
        if (!content?.trim() && !file) return null;

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const tempMessage = {
            id: tempId,
            conversation_id: conversationId,
            user_id: currentUser?.id,
            content: content?.trim() || (fileType === 'image' ? '📷 Image' : '📎 ' + file?.name),
            type: fileType || 'text',
            file_name: file?.name,
            file_size: file?.size,
            created_at: new Date().toISOString(),
            user: { id: currentUser?.id, name: currentUser?.name },
            reply_to: replyingTo ? {
                id: replyingTo.id,
                user_id: replyingTo.user_id,
                content: replyingTo.content,
                type: replyingTo.type,
            } : null,
            sending: true,
        };

        setMessages(prev => [...prev, tempMessage]);
        const savedReplyingTo = replyingTo;
        setReplyingTo(null);

        try {
            let response;
            if (file) {
                const formData = new FormData();
                if (content?.trim()) formData.append('content', content.trim());
                formData.append(fileType === 'image' ? 'image' : 'file', file);
                if (savedReplyingTo) formData.append('reply_to_id', savedReplyingTo.id);
                response = await axios.post(`/api/chat/${conversationId}/messages`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                const data = { content: content.trim() };
                if (savedReplyingTo) data.reply_to_id = savedReplyingTo.id;
                response = await axios.post(`/api/chat/${conversationId}/messages`, data);
            }

            const newMessage = response.data;
            setMessages(prev => prev.map(m => m.id === tempId ? newMessage : m));
            return newMessage;
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setReplyingTo(savedReplyingTo);
            console.error('Failed to send message:', err);
            throw err;
        }
    }, [conversationId, currentUser, replyingTo]);

    const deleteMessage = useCallback(async (messageId) => {
        if (!conversationId) return;

        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, deleted_at: new Date().toISOString(), content: 'Ce message a été supprimé' } : m
        ));

        try {
            await axios.delete(`/api/chat/${conversationId}/messages/${messageId}`);
        } catch (err) {
            fetchMessages();
            console.error('Failed to delete message:', err);
        }
    }, [conversationId, fetchMessages]);

    const markAsRead = useCallback(async (messageId) => {
        if (!conversationId) return;
        try {
            await axios.post(`/api/chat/${conversationId}/messages/${messageId}/read`);
        } catch {
            // Silent fail
        }
    }, [conversationId]);

    const sendTyping = useCallback(() => {
        if (!conversationId || typingThrottleRef.current) return;

        typingThrottleRef.current = setTimeout(() => {
            typingThrottleRef.current = null;
        }, 2000);

        axios.post(`/api/chat/${conversationId}/typing`).catch(() => {});
    }, [conversationId]);

    useEffect(() => {
        if (!conversationId || !window.Echo) return;

        fetchMessages();

        const channel = window.Echo.private(`conversation.${conversationId}`);

        channel.listen('.message.sent', (e) => {
            setMessages(prev => [...prev, {
                id: e.id,
                conversation_id: e.conversation_id,
                user_id: e.user_id,
                content: e.content,
                type: e.type || 'text',
                file_path: e.file_path,
                file_name: e.file_name,
                file_type: e.file_type,
                file_size: e.file_size,
                file_url: e.file_url,
                reply_to: e.reply_to,
                created_at: e.created_at,
                user: { id: e.user_id, name: e.user_name },
            }]);
            setTypingUsers(prev => prev.filter(u => u.user_id !== e.user_id));
        });

        channel.listen('.message.deleted', (e) => {
            setMessages(prev => prev.map(m =>
                m.id === e.message_id
                    ? { ...m, deleted_at: new Date().toISOString(), content: 'Ce message a été supprimé' }
                    : m
            ));
        });

        channel.listen('.message.read', (e) => {
            setReadReceipts(prev => ({
                ...prev,
                [e.message_id]: { user_id: e.user_id, read_at: new Date().toISOString() },
            }));
        });

        channel.listen('.user.typing', (e) => {
            setTypingUsers(prev => {
                if (prev.find(u => u.user_id === e.user_id)) return prev;
                return [...prev, { user_id: e.user_id, user_name: e.user_name }];
            });

            if (typingTimeoutRef.current[e.user_id]) {
                clearTimeout(typingTimeoutRef.current[e.user_id]);
            }
            typingTimeoutRef.current[e.user_id] = setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u.user_id !== e.user_id));
                delete typingTimeoutRef.current[e.user_id];
            }, 3000);
        });

        return () => {
            channel.stopListening('.message.sent');
            channel.stopListening('.message.deleted');
            channel.stopListening('.message.read');
            channel.stopListening('.user.typing');
            window.Echo.leave(`conversation.${conversationId}`);
            Object.values(typingTimeoutRef.current).forEach(clearTimeout);
            typingTimeoutRef.current = {};
        };
    }, [conversationId, fetchMessages]);

    return {
        messages,
        loading,
        error,
        typingUsers,
        replyingTo,
        setReplyingTo,
        readReceipts,
        sendMessage,
        deleteMessage,
        markAsRead,
        sendTyping,
        refresh: fetchMessages,
    };
}

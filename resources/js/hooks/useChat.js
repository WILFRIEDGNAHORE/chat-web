import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

/**
 * Custom hook for real-time chat functionality
 * Uses Echo for WebSocket communication
 */
export default function useChat(conversationId) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typingUsers, setTypingUsers] = useState([]);
    const typingTimeoutRef = useRef({});
    const typingThrottleRef = useRef(null);

    /**
     * Fetch messages for the conversation
     */
    const fetchMessages = useCallback(async () => {
        if (!conversationId) return;

        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`/api/chat/${conversationId}/messages`);
            // Cursor pagination returns data in desc order, reverse it
            const messagesData = response.data.data || [];
            setMessages(messagesData.reverse());
        } catch (err) {
            console.error('Failed to fetch messages:', err);
            setError('Erreur lors du chargement des messages');
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    /**
     * Send a new message
     */
    const sendMessage = useCallback(async (content) => {
        if (!conversationId || !content.trim()) return null;

        try {
            const response = await axios.post(`/api/chat/${conversationId}/messages`, {
                content: content.trim(),
            });

            const newMessage = response.data;
            setMessages(prev => [...prev, newMessage]);
            return newMessage;
        } catch (err) {
            console.error('Failed to send message:', err);
            throw err;
        }
    }, [conversationId]);

    /**
     * Send typing indicator (throttled)
     */
    const sendTyping = useCallback(() => {
        if (!conversationId || typingThrottleRef.current) return;

        typingThrottleRef.current = setTimeout(() => {
            typingThrottleRef.current = null;
        }, 2000);

        axios.post(`/api/chat/${conversationId}/typing`).catch(() => {
            // Silent fail for typing indicator
        });
    }, [conversationId]);

    /**
     * Setup Echo listeners for real-time updates
     */
    useEffect(() => {
        if (!conversationId || !window.Echo) return;

        // Initial fetch
        fetchMessages();

        const channel = window.Echo.private(`conversation.${conversationId}`);

        // Listen for new messages
        channel.listen('.message.sent', (e) => {
            console.log('💬 New message received:', e);
            setMessages(prev => [...prev, {
                id: e.id,
                conversation_id: e.conversation_id,
                user_id: e.user_id,
                content: e.content,
                created_at: e.created_at,
                user: { id: e.user_id, name: e.user_name },
            }]);

            // Clear typing indicator for this user
            setTypingUsers(prev => prev.filter(u => u.user_id !== e.user_id));
        });

        // Listen for typing indicators
        channel.listen('.user.typing', (e) => {
            console.log('⌨️ User typing:', e);
            setTypingUsers(prev => {
                if (prev.find(u => u.user_id === e.user_id)) return prev;
                return [...prev, { user_id: e.user_id, user_name: e.user_name }];
            });

            // Auto-clear typing after 3 seconds
            if (typingTimeoutRef.current[e.user_id]) {
                clearTimeout(typingTimeoutRef.current[e.user_id]);
            }
            typingTimeoutRef.current[e.user_id] = setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u.user_id !== e.user_id));
                delete typingTimeoutRef.current[e.user_id];
            }, 3000);
        });

        // Cleanup on unmount or conversation change
        return () => {
            channel.stopListening('.message.sent');
            channel.stopListening('.user.typing');
            window.Echo.leave(`conversation.${conversationId}`);

            // Clear all typing timeouts
            Object.values(typingTimeoutRef.current).forEach(clearTimeout);
            typingTimeoutRef.current = {};
        };
    }, [conversationId, fetchMessages]);

    return {
        messages,
        loading,
        error,
        typingUsers,
        sendMessage,
        sendTyping,
        refresh: fetchMessages,
    };
}

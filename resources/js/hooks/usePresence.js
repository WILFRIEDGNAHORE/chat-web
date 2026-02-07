import { useState, useEffect, useCallback } from 'react';

export default function usePresence() {
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        if (!window.Echo) return;

        const channel = window.Echo.join('online')
            .here((users) => {
                setOnlineUsers(users);
            })
            .joining((user) => {
                setOnlineUsers(prev => {
                    if (prev.find(u => u.id === user.id)) return prev;
                    return [...prev, user];
                });
            })
            .leaving((user) => {
                setOnlineUsers(prev => prev.filter(u => u.id !== user.id));
            });

        return () => {
            window.Echo.leave('online');
        };
    }, []);

    const isOnline = useCallback((userId) => {
        return onlineUsers.some(u => u.id === userId);
    }, [onlineUsers]);

    return { onlineUsers, isOnline };
}

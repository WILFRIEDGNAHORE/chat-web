import { Link, usePage } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';

export default function ChatBadge({ className = '' }) {
    const { unreadChatsCount = 0 } = usePage().props;

    return (
        <Link
            href="/chat"
            className={`relative p-2 text-white hover:bg-blue-600 hover:bg-opacity-50 rounded-lg transition-colors duration-200 ${className}`}
            aria-label="Messagerie"
        >
            <MessageCircle className="h-6 w-6" />
            {unreadChatsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center font-bold shadow-sm">
                    {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                </span>
            )}
        </Link>
    );
}

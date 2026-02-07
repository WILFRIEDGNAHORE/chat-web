import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Reply, Trash2 } from 'lucide-react';

export default function MessageActions({ message, isOwn, onReply, onDelete }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!showMenu) return;
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    if (message.deleted_at) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-full hover:bg-gray-200/50 transition-colors opacity-0 group-hover:opacity-100"
            >
                <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
                <div className={`absolute z-30 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[140px] ${
                    isOwn ? 'right-0' : 'left-0'
                } bottom-full mb-1`}>
                    <button
                        onClick={() => { onReply(message); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Reply className="w-4 h-4" />
                        Répondre
                    </button>
                    {isOwn && (
                        <button
                            onClick={() => { onDelete(message.id); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

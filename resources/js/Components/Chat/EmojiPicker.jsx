import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

const EMOJIS = [
    '😀', '😂', '😊', '😍', '🥰', '😘', '😎', '🤩',
    '😢', '😭', '😡', '🤔', '😱', '😴', '🤮', '🤗',
    '👍', '👎', '👏', '🙏', '🤝', '💪', '✌️', '🤞',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔',
    '🔥', '⭐', '✨', '💯', '🎉', '🎊', '🏆', '🎯',
    '✅', '❌', '⚠️', '💡', '📌', '🔔', '📎', '🔗',
    '🏠', '🏗️', '🔨', '🔧', '⚡', '🧱', '🪵', '🔩',
    '📐', '📏', '🎨', '🖌️',
];

export default function EmojiPicker({ onSelect, disabled }) {
    const [show, setShow] = useState(false);
    const pickerRef = useRef(null);

    useEffect(() => {
        if (!show) return;
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShow(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [show]);

    return (
        <div className="relative" ref={pickerRef}>
            <button
                type="button"
                onClick={() => setShow(!show)}
                disabled={disabled}
                className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
                <Smile className="w-5 h-5" />
            </button>

            {show && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-20 w-[280px]">
                    <div className="grid grid-cols-8 gap-0.5">
                        {EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                    onSelect(emoji);
                                    setShow(false);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

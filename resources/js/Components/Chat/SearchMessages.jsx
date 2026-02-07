import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, ArrowDown } from 'lucide-react';
import axios from 'axios';

export default function SearchMessages({ conversationId, onClose, onScrollToMessage }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const doSearch = useCallback(async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(`/api/chat/${conversationId}/search`, {
                params: { query: searchQuery },
            });
            setResults(response.data);
        } catch (err) {
            console.error('Search failed:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(value), 300);
    };

    const highlightText = (text, search) => {
        if (!search || search.length < 2) return text;
        const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part)
                ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
                : part
        );
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="absolute inset-0 bg-white z-40 flex flex-col">
            <div className="p-3 border-b border-gray-200 flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleChange}
                    placeholder="Rechercher dans la conversation..."
                    className="flex-1 border-none outline-none text-sm bg-transparent"
                    maxLength={100}
                />
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                        Recherche en cours...
                    </div>
                ) : query.length < 2 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                        Tapez au moins 2 caractères
                    </div>
                ) : results.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                        Aucun résultat
                    </div>
                ) : (
                    <div>
                        <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                            {results.length} résultat{results.length > 1 ? 's' : ''}
                        </div>
                        {results.map(msg => (
                            <button
                                key={msg.id}
                                onClick={() => {
                                    onScrollToMessage(msg.id);
                                    onClose();
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-gray-700">
                                        {msg.user?.name}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {formatTime(msg.created_at)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                    {highlightText(msg.content, query)}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

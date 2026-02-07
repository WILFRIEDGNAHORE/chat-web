import { useState } from 'react';
import { Download, FileText, X } from 'lucide-react';

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

export default function MessageContent({ message, isOwn }) {
    const [showFullImage, setShowFullImage] = useState(false);

    if (message.deleted_at) {
        return (
            <p className="text-sm italic text-gray-400">
                Ce message a été supprimé
            </p>
        );
    }

    if (message.type === 'image' && message.file_url) {
        return (
            <>
                <div
                    className="cursor-pointer rounded-lg overflow-hidden max-w-[240px]"
                    onClick={() => setShowFullImage(true)}
                >
                    <img
                        src={message.file_url}
                        alt={message.file_name || 'Image'}
                        className="w-full h-auto object-cover rounded-lg"
                        loading="lazy"
                    />
                </div>
                {message.content && message.content !== '📷 Image' && (
                    <p className="text-sm whitespace-pre-wrap break-words mt-1">
                        {message.content}
                    </p>
                )}

                {showFullImage && (
                    <div
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setShowFullImage(false)}
                    >
                        <button
                            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
                            onClick={() => setShowFullImage(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={message.full_image_url || message.file_url}
                            alt={message.file_name || 'Image'}
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </>
        );
    }

    if (message.type === 'file' && message.file_url) {
        return (
            <>
                <a
                    href={message.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={message.file_name}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isOwn
                            ? 'bg-blue-400/30 hover:bg-blue-400/50'
                            : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                        isOwn ? 'bg-blue-400/40' : 'bg-gray-200'
                    }`}>
                        <FileText className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
                            {message.file_name || 'Fichier'}
                        </p>
                        <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                            {formatFileSize(message.file_size)}
                        </p>
                    </div>
                    <Download className={`w-4 h-4 flex-shrink-0 ${isOwn ? 'text-blue-100' : 'text-gray-400'}`} />
                </a>
                {message.content && !message.content.startsWith('📎') && (
                    <p className="text-sm whitespace-pre-wrap break-words mt-1">
                        {message.content}
                    </p>
                )}
            </>
        );
    }

    return (
        <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
        </p>
    );
}

import { useState, useRef } from 'react';
import { Paperclip, Image, FileText } from 'lucide-react';

export default function FileUploadButton({ onFileSelect, disabled }) {
    const [showMenu, setShowMenu] = useState(false);
    const imageInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const menuRef = useRef(null);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileSelect(file, 'image');
        }
        e.target.value = '';
        setShowMenu(false);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileSelect(file, 'file');
        }
        e.target.value = '';
        setShowMenu(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                disabled={disabled}
                className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
                <Paperclip className="w-5 h-5" />
            </button>

            {showMenu && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div
                        ref={menuRef}
                        className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20 min-w-[160px]"
                    >
                        <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Image className="w-4 h-4 text-blue-500" />
                            Image
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <FileText className="w-4 h-4 text-orange-500" />
                            Fichier
                        </button>
                    </div>
                </>
            )}

            <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
            />
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}

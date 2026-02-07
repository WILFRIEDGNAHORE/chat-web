import { Head, usePage } from '@inertiajs/react';
import ChatSidebar from '@/Components/Chat/ChatSidebar';
import ChatWindow from '@/Components/Chat/ChatWindow';
import { MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Index() {
    const { conversations = [], activeConversationId, activeConversation } = usePage().props;
    const { auth } = usePage().props;
    const [selectedId, setSelectedId] = useState(activeConversationId || null);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Update selected conversation when prop changes
    useEffect(() => {
        if (activeConversationId) {
            setSelectedId(activeConversationId);
        }
    }, [activeConversationId]);

    // Find the selected conversation data
    const selectedConversation = selectedId
        ? (activeConversation && activeConversation.id === selectedId
            ? activeConversation
            : conversations.find(c => c.id === selectedId))
        : null;

    const handleBack = () => {
        setSelectedId(null);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <Head title="Messagerie" />

            {/* Main chat container */}
            <div
                className="flex-1 flex overflow-hidden"
                style={{ height: 'calc(100vh - 64px)' }}
            >
                {/* Sidebar - Hidden on mobile when conversation is selected */}
                <div
                    className={`
                        ${isMobile && selectedId ? 'hidden' : 'flex'}
                        w-full md:w-80 lg:w-96 flex-col border-r border-gray-200 bg-white
                    `}
                >
                    <ChatSidebar
                        conversations={conversations}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        currentUserId={auth.user.id}
                    />
                </div>

                {/* Chat window - Full width on mobile when conversation selected */}
                <div
                    className={`
                        ${isMobile && !selectedId ? 'hidden' : 'flex'}
                        flex-1 flex-col
                    `}
                >
                    {selectedId && selectedConversation ? (
                        <ChatWindow
                            conversationId={selectedId}
                            conversation={selectedConversation}
                            currentUser={auth.user}
                            onBack={handleBack}
                            isMobile={isMobile}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gray-50">
                            <div className="text-center px-4">
                                <div className="bg-blue-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                                    <MessageCircle className="w-12 h-12 text-blue-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Bienvenue dans la messagerie
                                </h3>
                                <p className="text-gray-500 max-w-sm">
                                    Sélectionnez une conversation dans la liste ou démarrez une nouvelle discussion depuis le profil d'un artisan.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile bottom navbar spacer */}
            <div className="h-16 md:hidden" />
        </div>
    );
}

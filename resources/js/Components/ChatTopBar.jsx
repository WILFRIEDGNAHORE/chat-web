import React from 'react';

/**
 * ChatTopBar — barre supérieure du chat (Tailwind pur, design Chatvia).
 *
 * Mobile : affiche un bouton retour ← pour revenir à la liste.
 * Desktop : pas de bouton retour (les 2 panneaux sont visibles).
 */
export default function ChatTopBar({ conversation, authUser, onBack }) {
    if (!conversation || !authUser) return null;

    const otherUser = conversation.users?.find(u => u.id !== authUser.id);
    const displayName = otherUser?.name || conversation.title || 'Conversation';
    const initials = (displayName || '?')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-chatvia-sidebar-dark flex-shrink-0">

            {/* Gauche : bouton retour (mobile) + avatar + nom */}
            <div className="flex items-center gap-3">
                {/* Bouton retour — visible seulement sur mobile */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-chatvia-muted hover:text-chatvia-primary hover:bg-chatvia-primary/10 transition-colors -ml-1"
                    >
                        <i className="ri-arrow-left-s-line text-2xl"></i>
                    </button>
                )}

                <div className="w-10 h-10 rounded-full bg-chatvia-primary text-white flex items-center justify-center text-sm font-semibold">
                    {initials}
                </div>
                <div>
                    <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {displayName}
                    </h5>
                </div>
            </div>

            {/* Droite : icônes d'action */}
            <div className="flex items-center gap-1">
                {[
                    { icon: 'ri-search-line', title: 'Rechercher' },
                    { icon: 'ri-phone-line', title: 'Appel audio' },
                    { icon: 'ri-vidicon-line', title: 'Appel vidéo' },
                    { icon: 'ri-user-2-line', title: 'Profil' },
                ].map(btn => (
                    <button
                        key={btn.icon}
                        type="button"
                        title={btn.title}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-chatvia-muted hover:text-chatvia-primary hover:bg-chatvia-primary/10 transition-colors"
                    >
                        <i className={`${btn.icon} text-lg`}></i>
                    </button>
                ))}
            </div>
        </div>
    );
}

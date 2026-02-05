import React from 'react';

/**
 * ChatTopBar — la barre en haut de la fenêtre de chat.
 *
 * Affiche :
 * - Un bouton retour (flèche ←)
 * - Un avatar avec les initiales de l'autre utilisateur
 * - Le nom de l'autre utilisateur
 * - Un bouton "..." pour les actions futures
 *
 * Props :
 * - conversation : la conversation active (contient la liste des users)
 * - authUser     : l'utilisateur connecté (pour identifier "l'autre")
 * - onBack       : fonction appelée quand on clique sur le bouton retour
 */
export default function ChatTopBar({ conversation, authUser, onBack }) {
    // Si pas de conversation ou pas d'utilisateur → ne rien afficher
    if (!conversation || !authUser) return null;

    // Trouver l'AUTRE utilisateur dans la conversation (celui qui n'est pas moi)
    // .find() parcourt le tableau et retourne le premier élément qui match la condition
    const otherUser = conversation.users?.find(
        user => user.id !== authUser.id
    );

    // Générer les initiales pour l'avatar (ex: "Jean Dupont" → "JD")
    // 1. Prendre le nom (ou "?" si pas de nom)
    // 2. split(' ') → couper par les espaces → ["Jean", "Dupont"]
    // 3. map(w => w[0]) → prendre la première lettre de chaque mot → ["J", "D"]
    // 4. join('') → joindre → "JD"
    // 5. toUpperCase() → mettre en majuscules
    // 6. slice(0, 2) → garder max 2 caractères
    const initials = (otherUser?.name || '?')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex items-center justify-between p-3 border-b bg-white shadow-sm">
            {/* Bouton retour : flèche gauche (← en HTML = &larr;) */}
            <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-800 mr-3"
            >
                &larr;
            </button>

            {/* Avatar (rond bleu avec initiales) + Nom de l'utilisateur */}
            <div className="flex items-center space-x-3 flex-1">
                {/* Avatar : cercle bleu avec les initiales en blanc */}
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                    {initials}
                </div>
                <div>
                    {/* Nom de l'autre utilisateur */}
                    <div className="font-semibold leading-tight">
                        {otherUser?.name || 'Unknown'}
                    </div>
                </div>
            </div>

            {/* Bouton d'actions (... = &hellip; en HTML) — placeholder pour le futur */}
            <div className="flex items-center">
                <button className="text-gray-600 hover:text-gray-800 text-xl">
                    &hellip;
                </button>
            </div>
        </div>
    );
}

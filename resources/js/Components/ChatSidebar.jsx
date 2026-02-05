import React from 'react';

/**
 * ChatSidebar — la barre latérale gauche qui affiche la liste des conversations.
 *
 * Chaque conversation affiche :
 * - Le titre (nom de l'autre utilisateur)
 * - Un aperçu du dernier message
 * - Un badge rouge avec le nombre de messages non lus (si > 0)
 *
 * Props :
 * - conversations : tableau de conversations formatées par le backend
 *   Chaque élément a : { id, title, last_message, unread_count, users }
 * - onSelect : fonction appelée quand on clique sur une conversation
 *   Le parent (ChatHome) l'utilise pour changer la conversation active
 */
export default function ChatSidebar({ conversations, onSelect }) {
    return (
        // Conteneur : prend 1/3 de la largeur, avec scroll si la liste est longue
        <div className="w-1/3 border-r p-2 overflow-y-auto">
            {/* Boucle sur chaque conversation pour créer un élément cliquable */}
            {conversations.map(conv => (
                <div
                    key={conv.id}  // Clé unique obligatoire pour React
                    className="p-2 border-b cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                    onClick={() => onSelect(conv)}  // Au clic → ouvrir cette conversation
                >
                    <div>
                        {/* Titre de la conversation (nom de l'autre personne) */}
                        <div className="font-semibold">{conv.title}</div>
                        {/* Aperçu du dernier message (tronqué si trop long grâce à "truncate") */}
                        <div className="text-sm text-gray-500 truncate">{conv.last_message}</div>
                    </div>

                    {/* Badge de messages non lus : affiché seulement si unread_count > 0 */}
                    {conv.unread_count > 0 && (
                        <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            {conv.unread_count}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

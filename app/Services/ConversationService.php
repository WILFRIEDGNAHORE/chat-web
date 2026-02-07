<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Collection;

class ConversationService
{
    /**
     * Get or create a private conversation between two users.
     *
     * - Une seule conversation privée possible entre deux utilisateurs
     * - Basée uniquement sur les participants (plus de logique BTP)
     */
    public function getOrCreatePrivateConversation(
        User $userA,
        User $userB
    ): Conversation {
        // Recherche d'une conversation privée existante entre les deux utilisateurs
        $conversation = Conversation::where('type', 'private')
            ->whereHas('users', fn ($q) => $q->where('user_id', $userA->id))
            ->whereHas('users', fn ($q) => $q->where('user_id', $userB->id))
            ->first();

        if ($conversation) {
            return $conversation;
        }

        // Création d'une nouvelle conversation privée
        $conversation = Conversation::create([
            'type' => 'private',
        ]);

        // Attache les deux utilisateurs à la conversation (table pivot)
        $conversation->users()->attach([
            $userA->id,
            $userB->id,
        ]);

        return $conversation;
    }

    /**
     * Get all conversations for a user
     * with latest message, unread count and other user (si privé).
     */
    public function getUserConversations(User $user): Collection
    {
        return $user->conversations()
            ->with([
                'users' => fn ($q) => $q->select('users.id', 'users.name'),
                'latestMessage.user:id,name',
            ])
            ->get()
            ->map(function ($conversation) use ($user) {
                $conversation->unread_count = $conversation->unreadMessagesCount($user->id);
                $conversation->other_user = $conversation->getOtherUser($user->id);

                return $conversation;
            })
            ->sortByDesc(fn ($c) => $c->latestMessage?->created_at ?? $c->created_at)
            ->values();
    }

    /**
     * Mark a conversation as read for a user.
     */
    public function markAsRead(Conversation $conversation, User $user): void
    {
        $conversation->users()->updateExistingPivot($user->id, [
            'last_read_at' => now(),
        ]);
    }

    /**
     * Get total unread messages count across all conversations for a user.
     */
    public function getTotalUnreadCount(User $user): int
    {
        return $user->conversations()
            ->get()
            ->sum(fn ($conversation) => $conversation->unreadMessagesCount($user->id));
    }
}

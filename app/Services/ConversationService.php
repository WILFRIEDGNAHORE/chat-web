<?php

// app/Services/ConversationService.php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;

class ConversationService
{
    public function getPrivateConversation(User $authUser, User $otherUser): Conversation
    {
        $conversation = Conversation::where('type', 'private')
            ->whereHas('users', fn ($q) => $q->where('users.id', $authUser->id))
            ->whereHas('users', fn ($q) => $q->where('users.id', $otherUser->id))
            ->first();

        if ($conversation) {
            return $conversation;
        }

        $conversation = Conversation::create(['type' => 'private']);
        $conversation->users()->attach([$authUser->id, $otherUser->id]);

        return $conversation;
    }
}

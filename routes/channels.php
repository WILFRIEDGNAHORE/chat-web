<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Conversation;

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    return \App\Models\Conversation::where('id', $conversationId)
        ->whereHas('users', fn($q) => $q->where('user_id', $user->id))
        ->exists();
});


Broadcast::channel('online', function ($user) {
    return ['id' => $user->id, 'name' => $user->name];
});

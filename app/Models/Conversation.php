<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Conversation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'type',
        'name',
    ];

    /**
     * Get the users participating in this conversation.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_user')
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    /**
     * Get all messages in this conversation.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    /**
     * Get the latest message in this conversation.
     */
    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    /**
     * Get the count of unread messages for a specific user.
     */
    public function unreadMessagesCount(string $userId): int
    {
        $pivot = $this->users()->where('user_id', $userId)->first()?->pivot;
        $lastRead = $pivot?->last_read_at;

        $query = $this->messages()->where('user_id', '!=', $userId);

        if ($lastRead) {
            $query->where('created_at', '>', $lastRead);
        }

        return $query->count();
    }

    /**
     * Check if a user is a participant of this conversation.
     */
    public function hasParticipant(string $userId): bool
    {
        return $this->users()->where('user_id', $userId)->exists();
    }

    /**
     * Get the other user in a private conversation.
     */
    public function getOtherUser(string $currentUserId): ?User
    {
        if ($this->type !== 'private') {
            return null;
        }

        return $this->users->firstWhere('id', '!=', $currentUserId);
    }
}

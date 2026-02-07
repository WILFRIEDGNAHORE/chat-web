<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'conversation_id',
        'reply_to_id',
        'user_id',
        'content',
        'type',
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'file_size' => 'integer',

    ];

    protected $appends = ['file_url'];

    /**
     * Get the conversation this message belongs to.
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * Get the user who sent this message.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id')->withTrashed();
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Message::class, 'reply_to_id');
    }

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) return null;

        $uploadService = app(\App\Services\UploadService::class);

        if ($this->type === 'image') {
            return $uploadService->thumbnailUrl($this->file_path);
        }

        return $uploadService->url($this->file_path);
    }

    public function getFullImageUrlAttribute(): ?string
    {
        if ($this->type !== 'image' || !$this->file_path) return null;
        return app(\App\Services\UploadService::class)->url($this->file_path);
    }

    /**
     * Check if this message has been read.
     */
    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    /**
     * Mark this message as read.
     */
    public function markAsRead(): void
    {
        if (!$this->isRead()) {
            $this->update(['read_at' => now()]);
        }
    }
}

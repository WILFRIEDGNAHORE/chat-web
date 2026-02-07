<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;

    public function __construct(Message $message)
    {
        $this->message = $message;
        $this->message->load(['user:id,name', 'replyTo:id,user_id,content,type,deleted_at']);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversation.' . $this->message->conversation_id)];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        $data = [
            'id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'user_id' => $this->message->user_id,
            'user_name' => $this->message->user->name,
            'content' => $this->message->content,
            'type' => $this->message->type,
            'file_path' => $this->message->file_path,
            'file_name' => $this->message->file_name,
            'file_type' => $this->message->file_type,
            'file_size' => $this->message->file_size,
            'file_url' => $this->message->file_url,
            'created_at' => $this->message->created_at->toISOString(),
            'reply_to' => null,
        ];

        if ($this->message->replyTo) {
            $data['reply_to'] = [
                'id' => $this->message->replyTo->id,
                'user_id' => $this->message->replyTo->user_id,
                'content' => $this->message->replyTo->trashed()
                    ? 'Ce message a été supprimé'
                    : $this->message->replyTo->content,
                'type' => $this->message->replyTo->type,
            ];
        }

        return $data;
    }
}

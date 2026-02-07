<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\Typing;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\ConversationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    public function __construct(private ConversationService $conversationService)
    {
    }

    /**
     * Get messages for a conversation (paginated, for infinite scroll)
     */
    public function index(Conversation $conversation)
    {
        $user = Auth::user();

        if (!$conversation->hasParticipant($user->id)) {
            abort(403, 'Vous n\'avez pas accès à cette conversation.');
        }

        $messages = $conversation->messages()
            ->with('user:id,name')
            ->orderBy('created_at')
            ->cursorPaginate(50);

        // Update last_read_at
        $this->conversationService->markAsRead($conversation, $user);

        return response()->json($messages);
    }

    /**
     * Send a message
     */
    public function store(Conversation $conversation, Request $request)
    {
        $user = Auth::user();

        if (!$conversation->hasParticipant($user->id)) {
            abort(403, 'Vous n\'avez pas accès à cette conversation.');
        }

        $validated = $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'content' => $validated['content'],
        ]);

        $message->load('user:id,name');

        // Broadcast to all participants except sender
        broadcast(new MessageSent($message))->toOthers();

        return response()->json([
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'user_id' => $message->user_id,
            'user_name' => $message->user->name,
            'content' => $message->content,
            'created_at' => $message->created_at->toISOString(),
        ], 201);
    }

    /**
     * Broadcast typing indicator
     */
    public function typing(Conversation $conversation)
    {
        $user = Auth::user();

        if (!$conversation->hasParticipant($user->id)) {
            abort(403, 'Vous n\'avez pas accès à cette conversation.');
        }

        broadcast(new Typing(
            $conversation->id,
            $user->id,
            $user->name
        ))->toOthers();

        return response()->json(['status' => 'ok']);
    }
}

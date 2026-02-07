<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ChatController extends Controller
{
    public function __construct(private ConversationService $conversationService)
    {
    }

    /**
     * Chat home page - list of conversations
     */
    public function index()
    {
        $user = Auth::user();
        $conversations = $this->conversationService->getUserConversations($user);

        return Inertia::render('Chat/Index', [
            'conversations' => $conversations,
            'activeConversationId' => null,
            'activeConversation' => null,
        ]);
    }

    /**
     * Show a specific conversation
     */
    public function show(Conversation $conversation)
    {
        $user = Auth::user();

        // Authorization: user must be a participant
        if (!$conversation->hasParticipant($user->id)) {
            abort(403, 'Vous n\'avez pas accès à cette conversation.');
        }

        $conversations = $this->conversationService->getUserConversations($user);

        $conversation->load([
            'users:id,name',
        ]);

        // Mark conversation as read
        $this->conversationService->markAsRead($conversation, $user);

        // Get the other user for the header
        $otherUser = $conversation->getOtherUser($user->id);

        return Inertia::render('Chat/Index', [
            'conversations' => $conversations,
            'activeConversationId' => $conversation->id,
            'activeConversation' => [
                'id' => $conversation->id,
                'type' => $conversation->type,
                'name' => $conversation->name,
                'other_user' => $otherUser ? [
                    'id' => $otherUser->id,
                    'name' => $otherUser->name,
                ] : null,
            ],
        ]);
    }

    /**
     * Start or resume a conversation with a user.
     * Called from artisan profile or BTP request pages.
     */
    public function startConversation(Request $request)
    {
        $request->validate([
            'recipient_id' => 'required|uuid|exists:users,id',
        ]);

        $user = Auth::user();
        $recipient = User::findOrFail($request->recipient_id);

        // Cannot chat with yourself
        if ($user->id === $recipient->id) {
            return redirect()->back()->with('error', 'Vous ne pouvez pas démarrer une conversation avec vous-même.');
        }

        $conversation = $this->conversationService->getOrCreatePrivateConversation(
            $user,
            $recipient,
        );

        return redirect()->route('chat.show', $conversation);
    }
}

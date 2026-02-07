<?php

namespace App\Http\Controllers;

use App\Events\MessageDeleted;
use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Events\Typing;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\ConversationService;
use App\Services\UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    public function __construct(
        private ConversationService $conversationService,
        private UploadService $uploadService
    ) {}

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
            ->with(['user:id,name', 'replyTo:id,user_id,content,type,deleted_at'])
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
            'content' => 'nullable|string|max:5000',
            'reply_to_id' => 'nullable|uuid|exists:messages,id',
            'image' => 'nullable|file|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,zip,rar|max:10240',
        ]);

        if (!$request->hasFile('image') && !$request->hasFile('file') && empty($validated['content'])) {
            return response()->json(['error' => 'Un message ou un fichier est requis.'], 422);
        }

        try {
            $messageData = [
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
                'content' => $validated['content'] ?? '',
                'type' => 'text',
                'reply_to_id' => $validated['reply_to_id'] ?? null,
            ];

            if ($request->hasFile('image')) {
                $file = $request->file('image');
                $path = $this->uploadService->uploadImage($file, config('uploads.paths.chat.images'));
                $messageData['type'] = 'image';
                $messageData['file_path'] = $path;
                $messageData['file_name'] = $file->getClientOriginalName();
                $messageData['file_type'] = $file->getMimeType();
                $messageData['file_size'] = $file->getSize();
                if (empty($messageData['content'])) {
                    $messageData['content'] = '📷 Image';
                }
            } elseif ($request->hasFile('file')) {
                $file = $request->file('file');
                $path = $this->uploadService->uploadFile($file, config('uploads.paths.chat.files'));
                $messageData['type'] = 'file';
                $messageData['file_path'] = $path;
                $messageData['file_name'] = $file->getClientOriginalName();
                $messageData['file_type'] = $file->getMimeType();
                $messageData['file_size'] = $file->getSize();
                if (empty($messageData['content'])) {
                    $messageData['content'] = '📎 ' . $file->getClientOriginalName();
                }
            }

            $message = Message::create($messageData);
            $message->load(['user:id,name', 'replyTo:id,user_id,content,type,deleted_at']);

            try {
                broadcast(new MessageSent($message))->toOthers();
                WebPushHelper::sendNewMessage($message, $conversation);
            } catch (\Throwable $e) {
                report($e);
            }

            $data = [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'user_id' => $message->user_id,
                'user_name' => $message->user->name,
                'content' => $message->content,
                'type' => $message->type,
                'file_path' => $message->file_path,
                'file_name' => $message->file_name,
                'file_type' => $message->file_type,
                'file_size' => $message->file_size,
                'file_url' => $message->file_url,
                'reply_to' => null,
                'created_at' => $message->created_at->toISOString(),
            ];

            if ($message->replyTo) {
                $data['reply_to'] = [
                    'id' => $message->replyTo->id,
                    'user_id' => $message->replyTo->user_id,
                    'content' => $message->replyTo->trashed()
                        ? 'Ce message a été supprimé'
                        : $message->replyTo->content,
                    'type' => $message->replyTo->type,
                ];
            }

            return response()->json($data, 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Une erreur est survenue lors de l\'envoi du message.'], 500);
        }
    }

    /**
     * Soft delete a message (owner only)
     */
    public function destroy(Conversation $conversation, Message $message)
    {
        $user = Auth::user();

        if (!$conversation->hasParticipant($user->id)) {
            abort(403, 'Vous n\'avez pas accès à cette conversation.');
        }

        if ($message->user_id !== $user->id) {
            abort(403, 'Vous ne pouvez supprimer que vos propres messages.');
        }

        if ($message->conversation_id !== $conversation->id) {
            abort(404);
        }

        try {
            $message->delete();

            try {
                broadcast(new MessageDeleted($message->id, $conversation->id))->toOthers();
            } catch (\Throwable $e) {
                report($e);
            }

            return response()->json(['status' => 'ok']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Erreur lors de la suppression.'], 500);
        }
    }

    /**
     * Search messages in a conversation
     */
    public function search(Conversation $conversation, Request $request)
    {
        $user = Auth::user();

        if (!$conversation->hasParticipant($user->id)) {
            abort(403, 'Vous n\'avez pas accès à cette conversation.');
        }

        $validated = $request->validate([
            'query' => 'required|string|min:2|max:100',
        ]);

        $messages = $conversation->messages()
            ->with('user:id,name')
            ->where('content', 'like', '%' . $validated['query'] . '%')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json($messages);
    }

    /**
     * Mark a message as read
     */
    public function markAsRead(Conversation $conversation, Message $message)
    {
        $user = Auth::user();

        if (!$conversation->hasParticipant($user->id)) {
            abort(403, 'Vous n\'avez pas accès à cette conversation.');
        }

        if ($message->conversation_id !== $conversation->id) {
            abort(404);
        }

        if ($message->user_id !== $user->id && !$message->isRead()) {
            $message->markAsRead();

            try {
                broadcast(new MessageRead($conversation->id, $user->id, $message->id))->toOthers();
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json(['status' => 'ok']);
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

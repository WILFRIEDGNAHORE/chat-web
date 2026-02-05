<?php

namespace App\Http\Controllers;

use App\Models\Message;
use Illuminate\Http\Request;
use App\Events\MessageSent;

/**
 * MessageController — gère la lecture et l'envoi de messages.
 *
 * Deux actions :
 * - index() → GET  /conversations/{id}/messages → charger les messages d'une conversation
 * - store() → POST /messages/send               → envoyer un nouveau message
 */
class MessageController extends Controller
{
    /**
     * Charger les messages d'une conversation : GET /conversations/{conversation}/messages
     *
     * Appelé par le frontend (axios) quand l'utilisateur clique sur une conversation
     * dans la sidebar. Retourne les messages en JSON.
     *
     * Le paramètre $conversation est automatiquement résolu par Laravel
     * (Route Model Binding : l'ID dans l'URL → objet Conversation).
     */
    public function index(\App\Models\Conversation $conversation)
    {
        // Sécurité : vérifier que l'utilisateur connecté fait partie de cette conversation
        // abort_unless = "si la condition est fausse, renvoyer une erreur 403 (Interdit)"
        abort_unless(
            $conversation->users->contains(auth()->id()),
            403
        );

        // Marquer comme lus tous les messages des AUTRES utilisateurs dans cette conversation
        // Cela met à jour le compteur de non-lus dans la sidebar
        $conversation->messages()
            ->where('user_id', '!=', auth()->id())   // Messages des autres (pas les miens)
            ->whereNull('read_at')                    // Qui ne sont pas encore lus
            ->update(['read_at' => now()]);            // Les marquer comme lus

        // Charger les messages avec les infos de l'auteur (user) de chaque message
        // messages.user = "pour chaque message, charge aussi le user associé"
        $conversation->load(['messages.user']);

        // Retourner les messages en JSON (le frontend les affiche dans le chat)
        return response()->json([
            'messages' => $conversation->messages
        ]);
    }

    /**
     * Envoyer un nouveau message : POST /messages/send
     *
     * Appelé par le frontend quand l'utilisateur clique "Envoyer".
     * Le message est :
     * 1. Validé (conversation existe, contenu non vide, max 5000 caractères)
     * 2. Sauvegardé en base de données
     * 3. Broadcasté via Pusher aux autres participants (temps réel)
     * 4. Retourné en JSON à l'émetteur
     */
    public function store(Request $request)
    {
        // Validation des données reçues du frontend
        // Si une règle échoue, Laravel renvoie automatiquement une erreur 422
        $request->validate([
            'conversation_id' => 'required|exists:conversations,id', // Doit exister en base
            'content' => 'required|string|max:5000',                 // Non vide, max 5000 chars
        ]);

        // Sécurité : vérifier que l'utilisateur fait partie de cette conversation
        // Sans ça, n'importe qui pourrait envoyer un message dans n'importe quelle conversation
        $conversation = \App\Models\Conversation::findOrFail($request->conversation_id);
        abort_unless($conversation->users->contains(auth()->id()), 403);

        // Créer le message en base de données
        $message = Message::create([
            'conversation_id' => $request->conversation_id,
            'user_id' => auth()->id(),       // L'auteur = l'utilisateur connecté
            'content' => $request->content,
        ]);

        // Charger la relation "user" pour inclure le nom de l'auteur
        $message->load('user');

        // Envoyer le message en temps réel via Pusher à tous les autres participants
        // broadcast() = déclenche l'event MessageSent
        // toOthers() = exclut l'émetteur (il a déjà le message localement)
        broadcast(new MessageSent($message))->toOthers();

        // Retourner le message créé en JSON à l'émetteur
        // Le frontend l'ajoute directement à la liste des messages affichés
        return response()->json([
            'message' => [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'user_id' => $message->user_id,
                'content' => $message->content,
                'created_at' => $message->created_at,
                'user' => [
                    'id' => $message->user->id,
                    'name' => $message->user->name,
                ],
            ],
        ]);
    }
}

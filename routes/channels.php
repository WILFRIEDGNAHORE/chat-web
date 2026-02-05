<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Conversation;

/*
|--------------------------------------------------------------------------
| Broadcast Channels (Canaux de diffusion)
|--------------------------------------------------------------------------
|
| Ce fichier définit les règles d'autorisation pour les channels privés Pusher.
|
| Quand un utilisateur JavaScript essaie de s'abonner à un channel privé
| (ex: "private-conversation.5"), Pusher envoie une requête à Laravel
| (POST /broadcasting/auth) pour vérifier si cet utilisateur a le DROIT
| d'écouter sur ce channel.
|
| La fonction callback reçoit :
| - $user : l'utilisateur connecté (automatiquement injecté par Laravel)
| - Les paramètres du channel (ici : $conversationId)
|
| Elle doit retourner :
| - true  → l'utilisateur est autorisé à écouter
| - false → l'accès est refusé (403 Forbidden)
|
*/

// Channel privé pour chaque conversation
// "conversation.{conversationId}" côté Laravel = "private-conversation.{id}" côté Pusher
Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {

    // Vérifier que l'utilisateur est connecté
    if (!$user) {
        \Log::warning("Auth Channel: pas d'utilisateur connecté pour conversation_id={$conversationId}");
        return false;
    }

    // Chercher la conversation en base de données et charger ses utilisateurs
    $conversation = Conversation::with('users')->find($conversationId);

    // Si la conversation n'existe pas → refuser
    if (!$conversation) {
        \Log::warning("Auth Channel: conversation_id={$conversationId} introuvable pour user_id={$user->id}");
        return false;
    }

    // Vérifier si l'utilisateur fait partie de cette conversation
    // pluck('id') = extraire tous les IDs des utilisateurs → [1, 3, 7]
    // contains() = vérifier si l'ID de l'utilisateur est dans cette liste
    $isMember = $conversation->users->pluck('id')->contains($user->id);

    \Log::info(
        "Auth Channel: user_id={$user->id}, conversation_id={$conversationId}, autorisé=" . ($isMember ? 'oui' : 'non')
    );

    // true = autorisé, false = refusé
    return $isMember;
});

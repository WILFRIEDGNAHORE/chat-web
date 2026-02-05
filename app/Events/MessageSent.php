<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * Event MessageSent — déclenché quand un utilisateur envoie un message.
 *
 * Cet event est "broadcasté" en temps réel via Pusher pour que les autres
 * utilisateurs de la conversation reçoivent le message instantanément,
 * sans avoir à recharger la page.
 *
 * ShouldBroadcastNow = l'event est envoyé IMMÉDIATEMENT à Pusher.
 * (contrairement à ShouldBroadcast qui le met en file d'attente et
 *  nécessite "php artisan queue:work" pour fonctionner)
 */
class MessageSent implements ShouldBroadcastNow
{
    // InteractsWithSockets : permet d'exclure l'émetteur via toOthers()
    // SerializesModels : convertit les modèles Eloquent pour le broadcasting
    use InteractsWithSockets, SerializesModels;

    /** Le message qui vient d'être envoyé (objet Eloquent Message) */
    public $message;

    /**
     * Constructeur : appelé quand on fait "new MessageSent($message)"
     *
     * load('user') charge la relation "user" du message pour pouvoir
     * inclure le nom de l'auteur dans les données envoyées.
     */
    public function __construct(Message $message)
    {
        $this->message = $message->load('user');
    }

    /**
     * Sur quel channel (canal) envoyer cet event ?
     *
     * PrivateChannel = channel sécurisé, seuls les utilisateurs autorisés
     * (vérifiés dans routes/channels.php) peuvent écouter.
     *
     * Le nom "conversation.5" devient automatiquement "private-conversation.5"
     * côté Pusher (le préfixe "private-" est ajouté par Laravel).
     */
    public function broadcastOn()
    {
        return new PrivateChannel('conversation.' . $this->message->conversation_id);
    }

    /**
     * Quelles données envoyer avec cet event ?
     *
     * C'est le JSON que le JavaScript (Pusher client) recevra.
     * On structure les données pour que le frontend puisse directement
     * les utiliser pour afficher le nouveau message dans le chat.
     */
    public function broadcastWith()
    {
        return [
            'id' => $this->message->id,                    // ID unique du message
            'conversation_id' => $this->message->conversation_id, // Dans quelle conversation
            'user_id' => $this->message->user_id,          // Qui l'a envoyé (ID)
            'user' => [
                'id' => $this->message->user->id,          // Info user pour l'affichage
                'name' => $this->message->user->name,
            ],
            'content' => $this->message->content,           // Le texte du message
            'created_at' => $this->message->created_at->toDateTimeString(), // Date d'envoi
        ];
    }
}

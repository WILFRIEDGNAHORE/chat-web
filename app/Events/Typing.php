<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * Event Typing — déclenché quand un utilisateur est en train d'écrire.
 *
 * Permet d'afficher "Jean est en train d'écrire..." en temps réel
 * chez les autres participants de la conversation.
 *
 * ShouldBroadcastNow = envoyé immédiatement à Pusher (pas de queue).
 */
class Typing implements ShouldBroadcastNow
{
    /** L'ID de la conversation dans laquelle l'utilisateur tape */
    public $conversation_id;

    /** Les informations de l'utilisateur qui tape (id + name) */
    public $user;

    /**
     * Constructeur : reçoit l'ID de la conversation et l'objet User.
     * On ne garde que l'id et le name de l'utilisateur (pas tout l'objet)
     * car c'est tout ce dont le frontend a besoin.
     */
    public function __construct($conversation_id, $user)
    {
        $this->conversation_id = $conversation_id;
        $this->user = ['id' => $user->id, 'name' => $user->name];
    }

    /**
     * Sur quel channel envoyer cet event ?
     * Même channel privé que MessageSent : la conversation concernée.
     */
    public function broadcastOn()
    {
        return new PrivateChannel('conversation.' . $this->conversation_id);
    }

    /**
     * Données envoyées au frontend via Pusher.
     * Le JavaScript recevra : { user_id: 3, user_name: "Jean" }
     */
    public function broadcastWith()
    {
        return [
            'user_id' => $this->user['id'],
            'user_name' => $this->user['name'],
        ];
    }
}

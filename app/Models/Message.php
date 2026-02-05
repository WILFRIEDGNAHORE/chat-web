<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle Message — représente un message envoyé dans une conversation.
 *
 * Chaque message :
 * - Appartient à UNE conversation (conversation_id)
 * - A été écrit par UN utilisateur (user_id)
 * - Contient du texte (content)
 * - Peut avoir été lu ou non (read_at : null = pas lu, date = lu à cette date)
 */
class Message extends Model
{
    use HasFactory;

    /**
     * Champs autorisés pour la création en masse via Message::create([...]).
     * On autorise : conversation_id, user_id, content, read_at.
     */
    protected $fillable = ['conversation_id', 'user_id', 'content', 'read_at'];

    /**
     * Relation many-to-one : ce message appartient à UNE conversation.
     * Exemple : $message->conversation → l'objet Conversation associé
     */
    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * Relation many-to-one : ce message a été écrit par UN utilisateur.
     * Exemple : $message->user → l'objet User qui a écrit ce message
     * Exemple : $message->user->name → "Jean Dupont"
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

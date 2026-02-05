<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle Conversation — représente une discussion entre 2 (ou plus) utilisateurs.
 *
 * Une conversation contient :
 * - Des utilisateurs (via la table pivot conversation_user)
 * - Des messages (chaque message appartient à une conversation)
 */
class Conversation extends Model
{
    use HasFactory;

    /**
     * Champs autorisés pour la création/modification en masse.
     * Seul le titre peut être défini via Conversation::create(['title' => '...']).
     */
    protected $fillable = ['title'];

    /**
     * Relation many-to-many : une conversation a PLUSIEURS utilisateurs.
     * La table pivot "conversation_user" stocke les liens conversation_id <-> user_id.
     *
     * Exemple d'utilisation :
     *   $conversation->users          → tous les utilisateurs de cette conversation
     *   $conversation->users()->attach($userId)  → ajouter un utilisateur
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'conversation_user');
    }

    /**
     * Relation one-to-many : une conversation contient PLUSIEURS messages.
     * Les messages sont triés par date de création (du plus ancien au plus récent).
     *
     * Exemple : $conversation->messages → tous les messages triés chronologiquement
     */
    public function messages()
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    /**
     * Relation one-to-one : récupère le DERNIER message de la conversation.
     * latestOfMany() prend automatiquement le message le plus récent.
     *
     * Utilisé dans la sidebar pour afficher un aperçu du dernier message.
     * Exemple : $conversation->lastMessage?->content → "Salut !"
     */
    public function lastMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    /**
     * Compte le nombre de messages NON LUS dans cette conversation pour un utilisateur.
     *
     * Logique :
     * - On ne compte que les messages envoyés par les AUTRES utilisateurs (pas les siens)
     * - On ne compte que ceux dont read_at est null (pas encore lus)
     *
     * @param int $userId  L'ID de l'utilisateur qui regarde la conversation
     * @return int  Le nombre de messages non lus
     */
    public function unreadCount($userId)
    {
        return $this->messages()
            ->where('user_id', '!=', $userId)  // Messages des AUTRES, pas les miens
            ->whereNull('read_at')              // Qui n'ont PAS été lus
            ->count();                          // On compte combien il y en a
    }
}

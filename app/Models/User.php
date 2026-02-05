<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle User — représente un utilisateur de l'application.
 *
 * Chaque utilisateur peut :
 * - Participer à plusieurs conversations (relation many-to-many)
 * - Envoyer plusieurs messages (relation one-to-many)
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Champs que l'on peut remplir via User::create([...]) ou $user->fill([...]).
     * Cela protège contre les modifications non autorisées (ex: un utilisateur
     * ne peut pas se définir "admin" en envoyant un champ supplémentaire).
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * Champs cachés quand on transforme le modèle en JSON (ex: dans les réponses API).
     * Le mot de passe et le token "remember me" ne doivent jamais être exposés.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Transformations automatiques des colonnes de la base de données :
     * - email_verified_at : stocké comme string en base → converti en objet Carbon (date)
     * - password : automatiquement hashé quand on fait $user->password = 'texte'
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Relation many-to-many : un utilisateur participe à PLUSIEURS conversations,
     * et une conversation a PLUSIEURS utilisateurs.
     *
     * La table pivot "conversation_user" fait le lien entre les deux.
     * withTimestamps() enregistre automatiquement quand le lien a été créé.
     */
    public function conversations()
    {
        return $this->belongsToMany(Conversation::class)->withTimestamps();
    }

    /**
     * Relation one-to-many : un utilisateur a écrit PLUSIEURS messages.
     * Chaque message a un user_id qui pointe vers cet utilisateur.
     */
    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}

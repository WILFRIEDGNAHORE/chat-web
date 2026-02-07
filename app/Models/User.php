<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle User — représente un utilisateur de l'application.
 */
class User extends Authenticatable
{
    use HasFactory, Notifiable, HasUuids; // ✅ Ajout de HasUuids

    /**
     * Champs remplissables via User::create([...])
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * UUID configuration
     */
    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Champs cachés en JSON
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Transformations automatiques
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Relation many-to-many : conversations
     */
    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, 'conversation_user')
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    /**
     * Relation one-to-many : messages envoyés
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}

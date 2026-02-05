<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * ChatController — gère l'affichage des pages du chat.
 *
 * Deux pages principales :
 * - index()  → /chat/home   → liste des conversations (aucune ouverte)
 * - show()   → /chat/{user} → ouvre la conversation avec un utilisateur précis
 */
class ChatController extends Controller
{
    /**
     * Formate les conversations pour l'affichage dans la sidebar.
     *
     * Transforme les objets Eloquent en tableaux simples avec seulement
     * les infos nécessaires au frontend (titre, dernier message, compteur non-lus).
     *
     * @param Collection $conversations  Les conversations Eloquent
     * @param User $me  L'utilisateur connecté (pour calculer le titre et les non-lus)
     * @return Collection  Les conversations formatées en tableaux
     */
    private function formatConversations($conversations, $me)
    {
        return $conversations->map(function ($conv) use ($me) {
            return [
                'id' => $conv->id,
                // Si la conversation n'a pas de titre, on utilise le nom de l'autre personne
                // ?? = "si null, utilise ce qui est à droite"
                'title' => $conv->title ?? $conv->users->where('id', '!=', $me->id)->pluck('name')->join(', '),
                // ?-> = "si lastMessage est null, retourne null au lieu de crasher"
                'last_message' => $conv->lastMessage?->content,
                'last_message_time' => $conv->lastMessage?->created_at,
                'unread_count' => $conv->unreadCount($me->id),
                // On ne garde que id et name des utilisateurs (pas email, password, etc.)
                'users' => $conv->users->map(fn($u) => ['id' => $u->id, 'name' => $u->name]),
            ];
        });
    }

    /**
     * Page d'accueil du chat : GET /chat/home
     *
     * Affiche la liste des conversations dans la sidebar, sans conversation ouverte.
     * with(['lastMessage', 'users']) = "eager loading" pour éviter les requêtes N+1
     * (charge le dernier message et les utilisateurs en 2 requêtes au lieu de 100).
     */
    public function index()
    {
        $me = auth()->user(); // L'utilisateur actuellement connecté

        // Récupérer toutes les conversations de l'utilisateur avec les relations nécessaires
        $conversations = $me->conversations()->with(['lastMessage', 'users'])->get();

        // Inertia::render envoie les données au composant React "ChatHome"
        return Inertia::render('ChatHome', [
            'conversations' => $this->formatConversations($conversations, $me),
            'activeConversation' => null,   // Aucune conversation ouverte
            'messages' => [],                // Pas de messages à afficher
            'auth_user' => $me,              // L'utilisateur connecté (pour le frontend)
        ]);
    }

    /**
     * Page d'une conversation : GET /chat/{user}
     *
     * Ouvre (ou crée) la conversation entre moi et {user}.
     * Le paramètre $user est automatiquement résolu par Laravel
     * grâce au "Route Model Binding" (l'ID dans l'URL → objet User).
     */
    public function show(User $user)
    {
        $me = auth()->user();

        // Chercher une conversation qui contient MOI et L'AUTRE utilisateur
        // whereHas = "où il existe au moins un user qui match cette condition"
        $conversation = Conversation::whereHas('users', fn ($q) =>
                $q->where('users.id', $me->id)      // Conversation qui contient MOI
            )
            ->whereHas('users', fn ($q) =>
                $q->where('users.id', $user->id)     // ET qui contient L'AUTRE
            )
            ->with(['users', 'messages.user'])        // Charger les relations
            ->first();                                // Prendre la première (ou null)

        // Si aucune conversation n'existe entre nous deux, on la crée
        if (! $conversation) {
            $conversation = Conversation::create();                    // Créer la conversation
            $conversation->users()->attach([$me->id, $user->id]);     // Ajouter les 2 participants
            $conversation->load(['users', 'messages.user']);           // Charger les relations
        }

        // Quand on ouvre une conversation, on marque tous les messages des autres comme "lus"
        // Cela remet le compteur de non-lus à 0 pour cette conversation
        $conversation->messages()
            ->where('user_id', '!=', $me->id)    // Messages des AUTRES (pas les miens)
            ->whereNull('read_at')                // Qui n'ont pas encore été lus
            ->update(['read_at' => now()]);        // Les marquer comme lus maintenant

        // On charge aussi toutes les conversations pour la sidebar
        $conversations = $me->conversations()
            ->with(['users', 'lastMessage'])
            ->get();

        return Inertia::render('ChatHome', [
            'conversations' => $this->formatConversations($conversations, $me),
            'activeConversation' => $conversation,     // La conversation ouverte
            'messages' => $conversation->messages,      // Les messages de cette conversation
            'auth_user' => $me,
        ]);
    }
}

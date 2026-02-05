<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Events\Typing;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Routes Web
|--------------------------------------------------------------------------
|
| Ce fichier définit toutes les URLs de l'application et quelle fonction
| PHP (controller) est appelée quand l'utilisateur visite chaque URL.
|
| Middleware 'auth' = l'utilisateur doit être connecté pour accéder à la route.
| Middleware 'web'  = active les sessions, cookies, CSRF (protection des formulaires).
|
*/

// Accueil : redirige automatiquement vers la page de connexion
Route::get('/', function () {
    return redirect()->route('login');
});

// Route d'authentification pour Pusher (broadcasting en temps réel)
// Quand le JavaScript client veut se connecter à un channel privé,
// il envoie un POST ici. Laravel vérifie que l'utilisateur est connecté
// et autorisé (voir routes/channels.php).
Broadcast::routes(['middleware' => ['web', 'auth']]);

// Toutes les routes du chat — accessibles uniquement si connecté
Route::middleware('auth')->group(function () {

    // Page d'accueil du chat : affiche la liste des conversations
    Route::get('/chat/home', [ChatController::class, 'index'])
        ->name('chat.home');

    // Ouvrir une conversation avec un utilisateur spécifique
    // {user} sera remplacé par l'ID de l'utilisateur (ex: /chat/3)
    Route::get('/chat/{user}', [ChatController::class, 'show'])
        ->name('chat.show');

    // Envoyer un nouveau message (appelé par le formulaire du chat)
    Route::post('/messages/send', [MessageController::class, 'store'])
        ->name('messages.store');

    // Charger les messages d'une conversation (appelé par le frontend via axios)
    // {conversation} sera remplacé par l'ID de la conversation
    Route::get(
        '/conversations/{conversation}/messages',
        [MessageController::class, 'index']
    )->name('conversations.messages');

});

// Route pour l'indicateur "est en train d'écrire..."
// Appelée par le frontend à chaque frappe de touche (avec throttle côté JS)
Route::post('/typing', function (\Illuminate\Http\Request $request) {
    // Vérifier que la conversation existe
    $request->validate(['conversation_id' => 'required|exists:conversations,id']);

    // Broadcast l'event Typing à tous les autres participants
    // toOthers() = ne pas renvoyer à celui qui tape lui-même
    broadcast(new Typing($request->conversation_id, auth()->user()))->toOthers();
    return response()->json(['status' => 'ok']);
})->middleware(['web', 'auth']);

// Routes d'authentification (login, register, logout, etc.)
// Générées par Laravel Breeze dans le fichier auth.php
require __DIR__.'/auth.php';

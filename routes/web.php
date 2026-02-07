<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\MessageController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
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


// Toutes les routes du chat — accessibles uniquement si connecté
Route::middleware('auth')->group(function () {

    // Page d'accueil du chat : affiche la liste des conversations
    Route::prefix('chat')->middleware(['verified'])->group(function () {
        Route::get('/', [\App\Http\Controllers\ChatController::class, 'index'])->name('chat.index');
        Route::get('/{conversation}', [\App\Http\Controllers\ChatController::class, 'show'])->name('chat.show');
        Route::post('/start', [\App\Http\Controllers\ChatController::class, 'startConversation'])->name('chat.start');
    });

    // API Chat (JSON pour les messages)
    Route::prefix('api/chat')->group(function () {
        Route::get('/{conversation}/messages', [\App\Http\Controllers\MessageController::class, 'index'])->name('api.chat.messages');
        Route::post('/{conversation}/messages', [\App\Http\Controllers\MessageController::class, 'store'])->name('api.chat.messages.store');
        Route::post('/{conversation}/typing', [\App\Http\Controllers\MessageController::class, 'typing'])->name('api.chat.typing');
    });

});



// Routes d'authentification (login, register, logout, etc.)
// Générées par Laravel Breeze dans le fichier auth.php
require __DIR__.'/auth.php';

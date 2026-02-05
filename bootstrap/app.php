<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

/*
|--------------------------------------------------------------------------
| Bootstrap de l'application Laravel
|--------------------------------------------------------------------------
|
| Ce fichier est le point d'entrée de la configuration de l'application.
| Il dit à Laravel :
| - Où trouver les fichiers de routes (web, commands, channels)
| - Quels middlewares appliquer aux requêtes
| - Comment gérer les exceptions (erreurs)
|
*/

return Application::configure(basePath: dirname(__DIR__))

    // Enregistrement des fichiers de routes
    ->withRouting(
        web: __DIR__.'/../routes/web.php',             // Routes web (pages, API)
        commands: __DIR__.'/../routes/console.php',     // Commandes artisan personnalisées
        channels: __DIR__.'/../routes/channels.php',    // Channels Pusher (autorisation temps réel)
        health: '/up',                                  // URL de vérification que l'app tourne
    )

    // Configuration des middlewares (filtres appliqués aux requêtes HTTP)
    ->withMiddleware(function (Middleware $middleware): void {
        // Ajouter des middlewares au groupe "web" (toutes les requêtes du navigateur)
        $middleware->web(append: [
            // HandleInertiaRequests : permet à Inertia de transmettre les données PHP → React
            \App\Http\Middleware\HandleInertiaRequests::class,
            // AddLinkHeadersForPreloadedAssets : optimise le chargement des fichiers CSS/JS
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);
    })

    // Configuration des exceptions (personnalisation des pages d'erreur)
    ->withExceptions(function (Exceptions $exceptions): void {
        // Pas de configuration personnalisée pour le moment
    })->create();

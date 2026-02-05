# Fix : Broadcasting Auth 403 Forbidden

## Problème

```
XHR POST http://127.0.0.1:8000/broadcasting/auth [HTTP/1.1 403 Forbidden]
```

Toute tentative de connexion à un channel privé Pusher échouait avec une erreur 403.

## Cause racine

Le fichier `routes/channels.php` n'était **jamais chargé** par Laravel.

Dans `bootstrap/app.php`, la méthode `withRouting()` ne déclarait pas le paramètre `channels:` :

```php
// AVANT (cassé)
->withRouting(
    web: __DIR__.'/../routes/web.php',
    commands: __DIR__.'/../routes/console.php',
    health: '/up',
)
```

Sans cette déclaration, les définitions de channels privés dans `routes/channels.php` ne sont jamais enregistrées. Quand le client Pusher tente de s'authentifier sur `private-conversation.{id}`, Laravel ne trouve aucun channel correspondant et renvoie systématiquement un 403.

## Correction

Ajout de `channels:` dans `bootstrap/app.php` :

```php
// APRÈS (corrigé)
->withRouting(
    web: __DIR__.'/../routes/web.php',
    commands: __DIR__.'/../routes/console.php',
    channels: __DIR__.'/../routes/channels.php',
    health: '/up',
)
```

## Fichiers modifiés

- `bootstrap/app.php` — ajout de `channels: __DIR__.'/../routes/channels.php'`
- `routes/web.php` — middleware broadcasting changé de `['auth']` à `['web', 'auth']` (correctif secondaire pour garantir que la session est disponible)

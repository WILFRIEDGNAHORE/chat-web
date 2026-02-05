# Guide : Construire un Mini Chat Temps Réel (Laravel + React + Pusher)

Ce guide est basé sur l'expérience réelle de construction de ce projet.
Chaque phase est dans l'ordre exact à suivre. Les bugs listés sont ceux réellement rencontrés.

---

## Phase 1 — Fondations (Base de données + Models)

### Ce qu'on fait
Créer la structure de données : qui peut parler à qui, où sont stockés les messages.

### Étapes
1. Créer le projet Laravel + Breeze (authentification)
   ```bash
   laravel new chat-web
   cd chat-web
   composer require laravel/breeze --dev
   php artisan breeze:install react
   ```

2. Créer les migrations
   ```bash
   php artisan make:model Conversation -m
   php artisan make:model Message -m
   php artisan make:migration create_conversation_user_table
   ```

3. Structure des tables :
   - `conversations` : id, title (nullable), timestamps
   - `messages` : id, conversation_id, user_id, content, read_at (nullable), timestamps
   - `conversation_user` (table pivot) : conversation_id, user_id, timestamps

4. Créer les Models avec leurs relations :
   - `User` → belongsToMany(Conversation), hasMany(Message)
   - `Conversation` → belongsToMany(User), hasMany(Message)
   - `Message` → belongsTo(Conversation), belongsTo(User)

5. Lancer les migrations
   ```bash
   php artisan migrate
   ```

### Bugs possibles
| Bug | Cause | Solution |
|-----|-------|----------|
| `SQLSTATE table not found` | Migration pas lancée | `php artisan migrate` |
| `Column not found: read_at` | Oubli du champ dans la migration | Créer une migration pour ajouter la colonne |
| Relation qui retourne vide | Nom de la table pivot incorrect | Vérifier que c'est `conversation_user` (ordre alphabétique) |

---

## Phase 2 — Controllers + Routes (Backend sans temps réel)

### Ce qu'on fait
Permettre d'afficher les conversations et d'envoyer des messages, sans temps réel pour le moment.

### Étapes
1. Créer les controllers
   ```bash
   php artisan make:controller ChatController
   php artisan make:controller MessageController
   ```

2. `ChatController@index` : lister les conversations de l'utilisateur
3. `ChatController@show` : ouvrir/créer une conversation avec un utilisateur
4. `MessageController@store` : envoyer un message (POST)
5. `MessageController@index` : charger les messages d'une conversation (GET)

6. Définir les routes dans `routes/web.php` (toutes protégées par `auth`)

### Points importants
- **Toujours vérifier l'appartenance** : un utilisateur ne doit accéder qu'aux conversations dont il fait partie (`abort_unless`)
- **Formater les données** pour le frontend : ne pas envoyer les objets Eloquent bruts, créer des tableaux avec seulement les champs nécessaires
- **Utiliser la même fonction de formatage** partout (éviter que `index()` et `show()` retournent des formats différents)

### Bugs possibles
| Bug | Cause | Solution |
|-----|-------|----------|
| Sidebar affiche des données vides | `show()` retourne un format différent de `index()` | Extraire le formatage dans une méthode privée partagée |
| N'importe qui peut envoyer dans n'importe quelle conversation | Pas de vérification d'appartenance dans `store()` | Ajouter `abort_unless($conversation->users->contains(auth()->id()), 403)` |
| Conversations dupliquées entre 2 users | Race condition sur la création | Utiliser une transaction ou vérifier avant de créer |
| `read_at` jamais mis à jour → compteur non-lus toujours faux | Aucun code ne marque les messages comme lus | Ajouter `->update(['read_at' => now()])` quand on charge les messages |

---

## Phase 3 — Frontend React (Affichage statique)

### Ce qu'on fait
Créer l'interface du chat : sidebar, fenêtre de messages, formulaire d'envoi.

### Étapes
1. Créer la page principale : `ChatHome.jsx`
   - Reçoit les données de Laravel via Inertia (props)
   - Gère l'état local : conversation active, messages, liste des conversations

2. Créer les composants :
   - `ChatSidebar.jsx` : liste cliquable des conversations + badge non-lus
   - `ChatWindow.jsx` : zone messages + formulaire d'envoi
   - `ChatTopBar.jsx` : nom de l'autre utilisateur + avatar

3. Envoyer les messages via `axios.post('/messages/send', {...})`
4. Charger les messages via `axios.get('/conversations/{id}/messages')`
5. Scroll automatique vers le dernier message avec `useRef` + `scrollIntoView`

### Points importants
- **Ne pas référencer des champs qui n'existent pas** (ex: `user.avatar`, `user.online`) → image cassée, statut toujours faux
- **Utiliser `useRef`** pour le scroll, pas de manipulation DOM directe
- **Gérer les cas null** : `activeConversation` peut être null (page d'accueil)

### Bugs possibles
| Bug | Cause | Solution |
|-----|-------|----------|
| Image cassée dans la top bar | Référence à `user.avatar` qui n'existe pas | Utiliser un avatar avec initiales à la place |
| Statut "Hors ligne" permanent | Référence à `user.online` qui n'existe pas | Supprimer ou implémenter la présence |
| `Cannot read property of undefined` | Pas de vérification null | Utiliser le chaînage optionnel `?.` partout |
| Messages qui disparaissent au changement de conversation | État non réinitialisé | `setMsgs([])` avant de charger les nouveaux |

---

## Phase 4 — Broadcasting (Temps réel avec Pusher)

### Ce qu'on fait
Recevoir les messages en temps réel sans recharger la page.

### Étapes

1. **Installer Pusher** (backend + frontend)
   ```bash
   composer require pusher/pusher-php-server
   npm install pusher-js
   ```

2. **Configurer le `.env`**
   ```env
   BROADCAST_CONNECTION=pusher
   PUSHER_APP_ID=xxx
   PUSHER_APP_KEY=xxx
   PUSHER_APP_SECRET=xxx
   PUSHER_APP_CLUSTER=eu

   VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
   VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
   ```

3. **Enregistrer les channels** dans `bootstrap/app.php`
   ```php
   ->withRouting(
       web: __DIR__.'/../routes/web.php',
       channels: __DIR__.'/../routes/channels.php',  // NE PAS OUBLIER
   )
   ```

4. **Déclarer la route broadcasting** dans `routes/web.php`
   ```php
   Broadcast::routes(['middleware' => ['web', 'auth']]);
   ```

5. **Créer l'autorisation du channel** dans `routes/channels.php`
   ```php
   Broadcast::channel('conversation.{id}', function ($user, $id) {
       return $conversation->users->contains($user->id);
   });
   ```

6. **Créer les Events**
   ```bash
   php artisan make:event MessageSent
   php artisan make:event Typing
   ```
   - Implémenter `ShouldBroadcastNow` (pas `ShouldBroadcast`)
   - Définir `broadcastOn()` → `PrivateChannel`
   - Définir `broadcastWith()` → données JSON envoyées au frontend

7. **Broadcaster dans le controller**
   ```php
   broadcast(new MessageSent($message))->toOthers();
   ```

8. **Écouter côté React** avec `new Pusher(...)` + `channel.bind(...)`

### Bugs possibles (les plus fréquents de tout le projet)

| Bug | Cause | Solution |
|-----|-------|----------|
| **403 Forbidden sur `/broadcasting/auth`** | `channels.php` jamais chargé | Ajouter `channels:` dans `withRouting()` de `bootstrap/app.php` |
| **403 Forbidden** (même après le fix) | Middleware `web` manquant | Mettre `['middleware' => ['web', 'auth']]` sur `Broadcast::routes()` |
| **Messages pas reçus en temps réel** | `ShouldBroadcast` + queue non lancée | Utiliser `ShouldBroadcastNow` ou lancer `php artisan queue:work` |
| **Message reçu en double chez l'émetteur** | `toOthers()` ne fonctionne pas | Envoyer le `X-Socket-ID` via axios (voir ci-dessous) |
| **`BROADCAST_CONNECTION=log` dans le `.env`** | Variable qui écrase `BROADCAST_DRIVER` | Mettre `BROADCAST_CONNECTION=pusher`, supprimer `BROADCAST_DRIVER` |
| **Sidebar pas mise à jour en temps réel** | Abonnement uniquement au channel actif | S'abonner à TOUS les channels des conversations |
| **Fuite de connexions WebSocket** | Nouvelle instance Pusher à chaque changement de conversation | Créer Pusher une seule fois avec `useRef`, réutiliser |
| **CSRF token manquant** | Pas de `<meta name="csrf-token">` dans le HTML | Ajouter la balise dans le layout Blade |

### Le bug du message en double (détail)
```
Toi → POST /messages/send → réponse HTTP → message ajouté localement (1ère fois)
                          → Pusher broadcast → tu le reçois aussi (2ème fois)
```
**Cause** : `toOthers()` a besoin du Socket ID pour t'exclure.
**Solution** :
```js
pusherRef.current.connection.bind('connected', () => {
    axios.defaults.headers.common['X-Socket-ID'] = pusherRef.current.connection.socket_id;
});
```

---

## Phase 5 — Typing Indicator

### Ce qu'on fait
Afficher "Jean est en train d'écrire..." en temps réel.

### Étapes
1. Créer l'Event `Typing` (même approche que `MessageSent`)
2. Route `POST /typing` qui broadcast l'event
3. Côté React : appeler `/typing` à chaque frappe de touche
4. Écouter l'event Pusher et afficher l'indicateur pendant 2 secondes

### Bugs possibles
| Bug | Cause | Solution |
|-----|-------|----------|
| 7 requêtes HTTP pour taper "bonjour" | Pas de throttle | Ajouter un throttle avec `useRef` + `setTimeout` (max 1 req/seconde) |
| L'indicateur reste affiché | Le `setTimeout` de reset ne se déclenche pas | Vérifier que le timer est bien nettoyé au démontage du composant |
| Tu vois ton propre indicateur de typing | Pas de filtre sur l'user_id | Ajouter `if (data.user_id !== auth_user.id)` |

---

## Phase 6 — Polish et Robustesse

### Ce qu'on fait
Corriger les derniers détails pour que tout soit solide.

### Checklist
- [ ] Compteur non-lus se remet à 0 quand on ouvre la conversation
- [ ] `read_at` est mis à jour côté backend quand on charge les messages
- [ ] Sidebar se met à jour en temps réel pour TOUTES les conversations
- [ ] Scroll automatique vers le dernier message
- [ ] Vider le champ de saisie après envoi
- [ ] Gestion des erreurs (try/catch sur les appels axios)
- [ ] Nettoyage des timers et abonnements Pusher au démontage des composants

---

## Résumé de l'ordre des phases

```
Phase 1 → Base de données + Models (les fondations)
  ↓
Phase 2 → Controllers + Routes (le backend fonctionne)
  ↓
Phase 3 → Composants React (l'interface s'affiche)
  ↓
Phase 4 → Pusher Broadcasting (le temps réel marche)
  ↓
Phase 5 → Typing indicator (la cerise sur le gâteau)
  ↓
Phase 6 → Polish (tout est propre et robuste)
```

## Top 5 des bugs les plus courants (dans l'ordre où tu vas les rencontrer)

1. **403 sur `/broadcasting/auth`** → `channels.php` pas chargé dans `bootstrap/app.php`
2. **Messages pas reçus en temps réel** → `ShouldBroadcast` + queue pas lancée → utiliser `ShouldBroadcastNow`
3. **Message en double** → `X-Socket-ID` manquant dans les requêtes axios
4. **Sidebar pas mise à jour** → abonnement uniquement au channel de la conversation active
5. **Données incohérentes entre pages** → `show()` et `index()` qui formatent les conversations différemment

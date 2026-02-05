# Bugs identifiés et corrections appliquées

---

## Bug 1 — Envoi de message sans vérification d'appartenance (SÉCURITÉ)

**Fichier** : `app/Http/Controllers/MessageController.php` — méthode `store()`

**Problème** : N'importe quel utilisateur authentifié pouvait envoyer un message dans n'importe quelle conversation, même s'il n'en faisait pas partie. Seule l'existence de la conversation était vérifiée (`exists:conversations,id`), pas l'appartenance de l'utilisateur.

**Correction** : Ajout d'un `abort_unless` qui vérifie que l'utilisateur connecté fait bien partie de la conversation avant de créer le message. Ajout aussi d'une limite `max:5000` sur le contenu.

```php
// AVANT
$request->validate([
    'conversation_id' => 'required|exists:conversations,id',
    'content' => 'required|string',
]);
$message = Message::create([...]);

// APRÈS
$request->validate([
    'conversation_id' => 'required|exists:conversations,id',
    'content' => 'required|string|max:5000',
]);
$conversation = Conversation::findOrFail($request->conversation_id);
abort_unless($conversation->users->contains(auth()->id()), 403);
$message = Message::create([...]);
```

---

## Bug 2 — Sidebar cassée sur la page d'une conversation

**Fichier** : `app/Http/Controllers/ChatController.php` — méthode `show()`

**Problème** : `index()` formatait les conversations en objets avec `title`, `last_message`, `unread_count`, `users`. Mais `show()` envoyait les collections Eloquent brutes. Résultat : la sidebar n'affichait ni titre, ni dernier message, ni compteur de non-lus quand on accédait à une conversation via URL.

**Correction** : Extraction de la logique de formatage dans une méthode privée `formatConversations()` utilisée par les deux méthodes.

```php
// AVANT (show)
$conversations = $me->conversations()->with(['users', 'lastMessage'])->get();
// → données brutes, sidebar cassée

// APRÈS (show)
$conversations = $me->conversations()->with(['users', 'lastMessage'])->get();
return [..., 'conversations' => $this->formatConversations($conversations, $me)];
// → même format que index()
```

---

## Bug 3 — Variable d'environnement broadcasting en conflit

**Fichier** : `.env`

**Problème** : Deux variables définissaient le driver de broadcasting :
- `BROADCAST_CONNECTION=log` (ligne 36)
- `BROADCAST_DRIVER=pusher` (ligne 50)

En Laravel 11, `BROADCAST_CONNECTION` est prioritaire. La valeur `log` désactivait silencieusement le broadcasting vers Pusher.

**Correction** : `BROADCAST_CONNECTION` mis à `pusher`, suppression du doublon `BROADCAST_DRIVER`.

```env
# AVANT
BROADCAST_CONNECTION=log
BROADCAST_DRIVER=pusher

# APRÈS
BROADCAST_CONNECTION=pusher
```

---

## Bug 4 — Fuite de connexions WebSocket Pusher

**Fichier** : `resources/js/Pages/ChatHome.jsx`

**Problème** : Le `useEffect` créait une nouvelle instance `new Pusher(...)` à chaque changement de conversation active. Chaque instance ouvrait une nouvelle connexion WebSocket. En naviguant entre conversations, les connexions s'accumulaient sans jamais être fermées (fuite mémoire et connexions).

**Correction** : L'instance Pusher est maintenant créée une seule fois via `useRef` et persiste pour toute la durée de vie du composant. Un second `useEffect` gère uniquement l'abonnement/désabonnement au channel.

```jsx
// AVANT — nouvelle instance à chaque conversation
useEffect(() => {
    const pusher = new Pusher(...);  // créé à chaque fois
    const channel = pusher.subscribe(...);
    return () => { channel.unsubscribe(); }; // pusher jamais disconnect
}, [activeConv]);

// APRÈS — instance unique, seul le channel change
const pusherRef = useRef(null);

useEffect(() => {  // 1 seule fois
    pusherRef.current = new Pusher(...);
    return () => pusherRef.current?.disconnect();
}, [auth_user]);

useEffect(() => {  // à chaque changement de conversation
    const channel = pusherRef.current.subscribe(...);
    return () => pusherRef.current?.unsubscribe(...);
}, [activeConv]);
```

---

## Bug 5 — Compteur de messages non lus toujours faux

**Fichiers** :
- `app/Http/Controllers/MessageController.php` — méthode `index()`
- `app/Http/Controllers/ChatController.php` — méthode `show()`

**Problème** : `Conversation::unreadCount()` comptait les messages où `read_at` est `null`. Mais rien dans le code ne mettait jamais `read_at` à jour. Le compteur affichait donc **tous** les messages des autres utilisateurs comme non lus, même après les avoir vus.

**Correction** : Ajout d'un `update(['read_at' => now()])` sur les messages non lus des autres utilisateurs, dans les deux endroits où les messages sont chargés :

```php
// Ajouté dans MessageController::index() et ChatController::show()
$conversation->messages()
    ->where('user_id', '!=', auth()->id())
    ->whereNull('read_at')
    ->update(['read_at' => now()]);
```

---

## Bug 6 — Typing envoie une requête à chaque touche

**Fichier** : `resources/js/Components/ChatWindow.jsx`

**Problème** : `handleTyping()` était appelé sur chaque événement `onChange` de l'input. Taper "bonjour" envoyait 7 requêtes `POST /typing`. Cela surchargeait le serveur et le système de broadcasting inutilement.

**Correction** : Ajout d'un throttle avec `useRef` — maximum 1 requête par seconde. Si une requête a été envoyée dans la dernière seconde, les suivantes sont ignorées.

```jsx
// AVANT — 1 requête par touche
const handleTyping = async () => {
    await axios.post('/typing', { conversation_id: conversation.id });
};

// APRÈS — max 1 requête/seconde
const typingTimerRef = useRef(null);
const handleTyping = useCallback(() => {
    if (!conversation || typingTimerRef.current) return;
    typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null;
    }, 1000);
    axios.post('/typing', { conversation_id: conversation.id }).catch(() => {});
}, [conversation]);
```

---

## Bug 7 — Avatar cassé et statut en ligne toujours faux

**Fichier** : `resources/js/Components/ChatTopBar.jsx`

**Problème** :
- `otherUser?.avatar` était utilisé comme `src` d'une balise `<img>`, mais le backend n'envoie jamais ce champ. L'image tombait en fallback sur `/default-avatar.png` qui n'existe pas non plus → image cassée.
- `otherUser?.online` était utilisé pour afficher "En ligne"/"Hors ligne", mais ce champ n'existe ni dans le modèle ni dans les données transmises. Tous les utilisateurs étaient affichés "Hors ligne" en permanence.

**Correction** : Remplacement de l'image par un avatar avec les initiales de l'utilisateur (rond coloré). Suppression du statut en ligne qui n'est pas implémenté côté backend.

```jsx
// AVANT — image cassée + statut toujours faux
<img src={otherUser?.avatar || '/default-avatar.png'} />
{otherUser?.online ? 'En ligne' : 'Hors ligne'}

// APRÈS — avatar initiales
<div className="w-10 h-10 rounded-full bg-blue-500 text-white ...">
    {initials}
</div>
```

---

## Bug 0 (précédent) — Broadcasting Auth 403 Forbidden

**Fichier** : `bootstrap/app.php`

**Problème** : `routes/channels.php` n'était jamais chargé car `withRouting()` ne déclarait pas le paramètre `channels:`. Aucun channel privé n'était enregistré → 403 systématique sur `/broadcasting/auth`.

**Correction** : Ajout de `channels: __DIR__.'/../routes/channels.php'` dans `withRouting()`.

---

## Récapitulatif des fichiers modifiés

| Fichier | Corrections |
|---------|-------------|
| `bootstrap/app.php` | Ajout du chargement de `channels.php` |
| `routes/web.php` | Middleware broadcasting `['web', 'auth']` |
| `.env` | `BROADCAST_CONNECTION=pusher`, suppression doublon |
| `app/Http/Controllers/MessageController.php` | Vérification appartenance + marquage read_at |
| `app/Http/Controllers/ChatController.php` | Format unifié sidebar + marquage read_at |
| `resources/js/Pages/ChatHome.jsx` | Instance Pusher unique via useRef |
| `resources/js/Components/ChatWindow.jsx` | Throttle typing (1 req/s) |
| `resources/js/Components/ChatTopBar.jsx` | Avatar initiales, suppression statut online |

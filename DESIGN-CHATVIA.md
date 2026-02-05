# Integration du Design Chatvia dans le Mini Chat

## Contexte

Le projet utilisait un design basique avec **Tailwind CSS** (classes utilitaires simples).
On a migré vers le template **Chatvia** (Bootstrap 5) pour avoir un design professionnel de chat.

**Chatvia** est un template HTML/CSS statique. Notre projet utilise **React + Inertia**.
On a donc gardé uniquement le CSS de Chatvia et réécrit le HTML en composants React.

---

## Structure visuelle Chatvia

```
┌──────────┬──────────────────┬──────────────────────────────┐
│          │                  │                              │
│  side-   │  chat-left-      │        user-chat             │
│  menu    │  sidebar         │                              │
│          │                  │  ┌──────────────────────────┐ │
│  (icônes │  (liste des      │  │ ChatTopBar (nom+icônes)  │ │
│  verticales) conversations) │  ├──────────────────────────┤ │
│          │                  │  │                          │ │
│  75px    │  380px           │  │  Messages (scrollable)   │ │
│          │                  │  │                          │ │
│  Logo    │  Recherche       │  ├──────────────────────────┤ │
│  Chat    │  "Récentes"      │  │ Input + bouton envoyer   │ │
│  DarkMode│  Conv 1          │  └──────────────────────────┘ │
│  Avatar  │  Conv 2          │                              │
│          │  Conv 3...       │         reste de la largeur  │
└──────────┴──────────────────┴──────────────────────────────┘
```

Cette structure est définie par les classes CSS de Chatvia :
- `.side-menu` → barre de 75px (horizontal en mobile, vertical en desktop)
- `.chat-leftsidebar` → panneau de 380px avec la liste des conversations
- `.user-chat` → zone principale qui prend le reste de la largeur
- `.layout-wrapper.d-lg-flex` → conteneur flex qui aligne les 3 zones

---

## Fichiers modifiés

### 1. Assets copiés

**Source** : `/home/gnahore/websites/CHAT/themesbrand.com/chatvia/layouts/assets/`
**Destination** : `public/chatvia/`

```
public/chatvia/
├── css/
│   ├── bootstrap.min.css    ← Framework CSS Bootstrap 5
│   ├── icons.min.css        ← Remix Icons + Material Design Icons
│   └── app.min.css          ← Styles spécifiques Chatvia (sidebar, bulles, etc.)
├── fonts/
│   ├── remixicon0c93.*      ← Police d'icônes Remix (ri-message-3-line, ri-send-plane-2-fill...)
│   └── materialdesignicons* ← Police d'icônes Material Design (mdi-*)
└── images/
    ├── logo-dark.png        ← Logo pour le mode clair
    ├── logo-light.png       ← Logo pour le mode sombre
    ├── favicon.ico
    └── users/
        └── avatar-1.jpg ... avatar-8.jpg  ← Avatars de démo (pas utilisés, on utilise des initiales)
```

**Pourquoi uniquement CSS/fonts/images ?**
Le template Chatvia utilise jQuery, Owl Carousel, SimpleBar, etc.
On n'en a **pas besoin** car React gère toute l'interactivité.
On garde uniquement le CSS pour l'apparence visuelle.

---

### 2. `resources/views/app.blade.php`

**Avant** :
```html
<link href="https://fonts.bunny.net/css?family=figtree..." rel="stylesheet" />
<!-- Tailwind chargé via Vite -->
```

**Après** :
```html
<link rel="shortcut icon" href="/chatvia/images/favicon.ico">
<link href="/chatvia/css/bootstrap.min.css" rel="stylesheet" />
<link href="/chatvia/css/icons.min.css" rel="stylesheet" />
<link href="/chatvia/css/app.min.css" rel="stylesheet" />
```

**Pourquoi ?**
- Les CSS Chatvia sont chargés **directement dans le HTML** (pas via Vite)
- Elles sont dans `public/` donc accessibles par le navigateur
- L'ordre est important : Bootstrap d'abord → icônes → app Chatvia

---

### 3. `resources/css/app.css`

**Avant** :
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Après** :
```css
/* Chatvia utilise Bootstrap 5 — Tailwind désactivé pour éviter les conflits */
```

**Pourquoi désactiver Tailwind ?**
`@tailwind base` inclut **Preflight** qui remet à zéro tous les styles HTML.
Ça casse les styles Bootstrap (marges des `<h1>`, padding des `<ul>`, etc.).
Les deux ne peuvent pas coexister sans configuration spéciale.

---

### 4. `resources/js/Pages/ChatHome.jsx` — Composant principal

C'est le chef d'orchestre. Il contient :

#### a) Le side-menu (barre d'icônes à gauche)

```jsx
<div className="side-menu flex-lg-column">
    {/* Logo */}
    <div className="navbar-brand-box">
        <a href="/" className="logo logo-dark">...</a>   {/* Visible en mode clair */}
        <a href="/" className="logo logo-light">...</a>  {/* Visible en mode sombre */}
    </div>

    {/* Icônes de navigation */}
    <ul className="nav nav-pills side-menu-nav">
        <li>Chat (ri-message-3-line)</li>
        <li>Dark Mode (ri-sun-line / ri-moon-clear-line)</li>
    </ul>

    {/* Avatar + Dropdown logout */}
    ...
</div>
```

**Classes CSS clés** :
- `.side-menu` → largeur 75px, position fixe, fond coloré
- `.navbar-brand-box` → zone du logo centrée
- `.side-menu-nav` → navigation avec icônes centrées
- `.logo-dark` / `.logo-light` → visibilité gérée par CSS selon le thème

#### b) Le Dark Mode

```jsx
const [darkMode, setDarkMode] = useState(false);

useEffect(() => {
    document.body.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
}, [darkMode]);
```

**Comment ça marche ?**
Chatvia utilise le système de thème natif de Bootstrap 5 :
- `<body data-bs-theme="light">` → mode clair (défaut)
- `<body data-bs-theme="dark">` → mode sombre

Le CSS `app.min.css` contient deux blocs de variables :
```css
/* Mode clair */
:root, [data-bs-theme=light] {
    --bs-sidebar-bg: #fff;
    --bs-body-bg: #fff;
    ...
}

/* Mode sombre */
[data-bs-theme=dark] {
    --bs-sidebar-bg: #36404a;
    --bs-body-bg: #262e35;
    ...
}
```

En changeant l'attribut `data-bs-theme`, **toutes les couleurs s'inversent automatiquement**.

#### c) Le dropdown de logout

Comme on n'utilise pas Bootstrap JS (pas de jQuery), le dropdown est géré en React :

```jsx
const [dropdownOpen, setDropdownOpen] = useState(false);

// Au clic sur l'avatar → toggle le menu
onClick={() => setDropdownOpen(!dropdownOpen)}

// Menu affiché conditionnellement
{dropdownOpen && (
    <div style={{ position: 'absolute', bottom: '100%', ... }}>
        <a onClick={handleLogout}>Déconnexion</a>
    </div>
)}
```

#### d) La logique Pusher (inchangée)

Tout le code temps réel est resté identique :
- Pusher singleton via `useRef`
- `X-Socket-ID` pour éviter le double message
- Subscription à TOUTES les conversations pour sidebar live
- `activeConvRef` pour éviter les stale closures
- Typing avec throttle

---

### 5. `resources/js/Components/ChatSidebar.jsx` — Liste des conversations

#### Structure HTML Chatvia

```jsx
<div className="chat-leftsidebar">           {/* Conteneur 380px */}
    <div className="px-4 pt-4">
        <h4>Chats</h4>
        <div className="search-box">...</div>  {/* Barre de recherche */}
    </div>

    <div className="chat-message-list">        {/* Zone scrollable */}
        <ul className="list-unstyled chat-list chat-user-list">
            <li className={isActive ? 'active' : ''}>  {/* Conversation */}
                <div className="d-flex align-items-center">
                    <div className="chat-user-img">Avatar</div>
                    <div className="flex-grow-1">
                        <h5>Nom</h5>
                        <p>Dernier message</p>
                    </div>
                    <div className="ms-auto">
                        <p>Heure</p>
                        <span className="badge">3</span>  {/* Non-lus */}
                    </div>
                </div>
            </li>
        </ul>
    </div>
</div>
```

**Classes CSS clés** :
- `.chat-leftsidebar` → largeur fixe 380px, fond `var(--bs-sidebar-bg)`
- `.chat-list li` → hover avec fond gris clair
- `.chat-list li.active` → fond violet clair quand sélectionné
- `.chat-user-img` → conteneur de l'avatar

#### Fonctionnalités ajoutées

- **Recherche** : filtre les conversations par nom en temps réel
- **Avatars colorés** : couleur basée sur `conv.id % 6` (6 couleurs en rotation)
- **Horodatage relatif** : "14:30" aujourd'hui, "Hier", "Lun.", "05/02"
- **Badge non-lus** : rond rouge avec le nombre (max "9+")

---

### 6. `resources/js/Components/ChatWindow.jsx` — Zone de chat

#### Écran d'accueil (aucune conversation ouverte)

```jsx
if (!conversation) {
    return (
        <div className="user-chat w-100" style={{ display: 'flex', alignItems: 'center', ... }}>
            <i className="ri-chat-3-line" style={{ fontSize: '4rem' }}></i>
            <h5>Sélectionnez une conversation</h5>
        </div>
    );
}
```

#### Bulles de messages

```jsx
<li className={isMine ? 'right' : ''}>       {/* 'right' = aligné à droite */}
    <div className="conversation-list">
        {!isMine && <div className="chat-avatar">...</div>}  {/* Avatar gauche */}
        <div className="user-chat-content">
            <small>{isMine ? 'Vous' : senderName}</small>
            <div className="ctext-wrap">
                <div className="ctext-wrap-content" style={{
                    backgroundColor: isMine ? '#7269ef' : 'var(--bs-secondary)',
                    color: isMine ? '#fff' : 'var(--bs-body-color)',
                }}>
                    <p>{msg.content}</p>
                    <p className="chat-time">
                        <i className="ri-time-line"></i> 14:30
                    </p>
                </div>
            </div>
        </div>
    </div>
</li>
```

**Classes CSS clés** :
- `.chat-conversation` → zone scrollable avec padding
- `.conversation-list` → conteneur flex pour avatar + bulle
- `.conversation-list` dans `li.right` → flex-direction inversée (message à droite)
- `.ctext-wrap-content` → la bulle elle-même (border-radius, padding)
- `.chat-avatar` → avatar à gauche du message

#### Couleurs des bulles
- **Mes messages** : fond `#7269ef` (violet Chatvia) + texte blanc
- **Messages reçus** : fond `var(--bs-secondary)` qui vaut :
  - Mode clair : `#f5f7fb` (gris très clair)
  - Mode sombre : `#7a7f9a` (gris moyen) — géré automatiquement par les CSS variables

#### Animation de typing

3 points qui montent et descendent :

```jsx
<span className="dot" style={{
    animation: 'typingDot 1.4s infinite ease-in-out',
    animationDelay: '0s'     // 1er point
}}></span>
<span className="dot" style={{
    animationDelay: '0.2s'   // 2ème point (décalé)
}}></span>
<span className="dot" style={{
    animationDelay: '0.4s'   // 3ème point (décalé)
}}></span>
```

L'animation est définie dans une balise `<style>` en bas du composant :
```css
@keyframes typingDot {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
}
```

#### Zone d'envoi

```jsx
<div className="chat-input-section p-3 p-lg-4">
    <form>
        <div className="row g-0 align-items-center">
            <div className="col">
                <input className="form-control form-control-lg border-0" ... />
            </div>
            <div className="col-auto">
                <button>
                    <i className="ri-send-plane-2-fill"></i>  {/* Icône avion */}
                </button>
            </div>
        </div>
    </form>
</div>
```

---

### 7. `resources/js/Components/ChatTopBar.jsx` — Barre supérieure

```jsx
<div className="p-3 p-lg-4" style={{ borderBottom: '1px solid ...' }}>
    <div className="row align-items-center">
        {/* Gauche : avatar + nom */}
        <div className="col-sm-4 col-8">
            <div className="d-flex align-items-center">
                <div>Avatar (initiales)</div>
                <h5>{displayName}</h5>
            </div>
        </div>

        {/* Droite : icônes d'action */}
        <div className="col-sm-8 col-4">
            <ul className="list-inline user-chat-nav text-end">
                <li><i className="ri-search-line"></i></li>      {/* Recherche */}
                <li><i className="ri-phone-line"></i></li>       {/* Appel audio */}
                <li><i className="ri-vidicon-line"></i></li>     {/* Appel vidéo */}
                <li><i className="ri-user-2-line"></i></li>      {/* Profil */}
            </ul>
        </div>
    </div>
</div>
```

Les icônes d'action (appel, vidéo, profil) sont visuelles pour l'instant.
Elles pourront être connectées à de vraies fonctionnalités plus tard.

---

## Classes CSS Chatvia importantes à connaitre

| Classe | Rôle | Taille |
|--------|------|--------|
| `.layout-wrapper.d-lg-flex` | Conteneur flex principal | 100vw |
| `.side-menu` | Barre d'icônes verticale | 75px |
| `.chat-leftsidebar` | Liste conversations | 380px |
| `.user-chat` | Zone de chat principale | reste |
| `.chat-message-list` | Zone scrollable sidebar | auto |
| `.chat-conversation` | Zone scrollable messages | auto |
| `.chat-input-section` | Zone saisie message | auto |
| `.conversation-list` | Conteneur d'un message | flex |
| `.ctext-wrap-content` | Bulle de message | inline-block |
| `.chat-list li.active` | Conversation sélectionnée | fond coloré |
| `li.right` | Message aligné à droite | flex-end |

## Couleurs Chatvia

| Variable / Valeur | Usage |
|-------------------|-------|
| `#7269ef` | Violet principal (bulles envoyées, avatar auth, boutons actifs) |
| `#50a5f1` | Bleu info (avatars reçus) |
| `#06d6a0` | Vert succès |
| `#ef476f` | Rouge danger (badges non-lus) |
| `#ffd166` | Jaune warning |
| `var(--bs-secondary)` | Fond des bulles reçues (s'adapte au thème) |
| `var(--bs-body-bg)` | Fond principal (blanc ou sombre) |
| `var(--bs-body-color)` | Texte principal (noir ou clair) |
| `var(--bs-sidebar-bg)` | Fond de la sidebar |

## Icônes utilisées (Remix Icons)

| Classe | Icône | Usage |
|--------|-------|-------|
| `ri-message-3-line` | Bulle de chat | Side menu |
| `ri-sun-line` | Soleil | Mode clair |
| `ri-moon-clear-line` | Lune | Mode sombre |
| `ri-search-line` | Loupe | Recherche |
| `ri-send-plane-2-fill` | Avion papier | Bouton envoyer |
| `ri-time-line` | Horloge | Timestamp message |
| `ri-phone-line` | Téléphone | Appel audio |
| `ri-vidicon-line` | Caméra | Appel vidéo |
| `ri-user-2-line` | Personne | Profil |
| `ri-logout-circle-r-line` | Sortie | Déconnexion |
| `ri-arrow-left-s-line` | Flèche gauche | Retour (mobile) |
| `ri-chat-3-line` | Bulle vide | Écran d'accueil |

---

## Responsive (Mobile)

Le CSS Chatvia gère automatiquement le responsive :

- **Desktop (> 992px)** : Les 3 colonnes côte à côte (side-menu + sidebar + chat)
- **Mobile (< 992px)** : Le side-menu passe en barre horizontale en bas, la sidebar prend toute la largeur

Les classes Bootstrap `d-lg-flex`, `d-none d-lg-block`, `col-sm-4 col-8` gèrent ces breakpoints.

---

## Résumé : ce qu'on a gardé vs changé

| Aspect | Avant | Après |
|--------|-------|-------|
| **Framework CSS** | Tailwind | Bootstrap 5 (Chatvia) |
| **Layout** | `flex h-[80vh]` simple | 3 colonnes Chatvia |
| **Sidebar** | `w-1/3 border-r` | `.chat-leftsidebar` (380px, recherche, timestamps) |
| **Messages** | `bg-blue-200` / `bg-gray-200` | Bulles violet/gris avec timestamps |
| **Input** | `<input> + <button>Envoyer</button>` | Input transparent + icône avion |
| **Top bar** | Flèche + nom + "..." | Avatar + nom + 4 icônes d'action |
| **Dark mode** | Non | Oui (toggle dans side-menu) |
| **Icônes** | Aucune | Remix Icons (ri-*) |
| **Logo** | Texte "Chat Web" | Logo image Chatvia |
| **Logique Pusher** | ✅ | ✅ (identique, aucun changement) |
| **Typing** | Texte "est en train d'écrire" | Animation 3 dots |
| **Non-lus** | Cercle rouge Tailwind | Badge Bootstrap arrondi |

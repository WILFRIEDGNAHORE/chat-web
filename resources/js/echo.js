import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Monte Pusher sur window pour Echo
window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY, // vérifie ton .env
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER, // ex: 'eu'
    forceTLS: true,
    encrypted: true,
    authEndpoint: '/broadcasting/auth', // pour PrivateChannel
});

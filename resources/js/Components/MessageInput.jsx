import { useForm } from '@inertiajs/react';
import Pusher from 'pusher-js';

export default function MessageInput({ conversationId }) {
    const { data, setData, post, reset } = useForm({
        conversation_id: conversationId,
        content: '',
    });

    function submit(e) {
        e.preventDefault();
        post('/messages/send', { onSuccess: () => reset('content') });
    }

    function handleTyping(e) {
        setData('content', e.target.value);

        fetch('/typing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
            body: JSON.stringify({ conversation_id: conversationId }),
        }).then(() => console.log('Typing envoyé'));
    }

    return (
        <form onSubmit={submit} className="p-4 border-t flex">
            <input
                className="flex-1 border rounded px-3"
                value={data.content}
                onChange={handleTyping}
                placeholder="Écrire un message..."
            />
        </form>
    );
}

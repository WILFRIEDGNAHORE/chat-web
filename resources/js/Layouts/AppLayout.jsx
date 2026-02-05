import React from 'react';
import { Link } from '@inertiajs/react';

export default function AppLayout({ children }) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar simple */}
            <header className="bg-blue-600 text-white p-4">
                <div className="container mx-auto flex justify-between">
                    <h1 className="font-bold text-xl">Chat Web</h1>
                    <Link
                        href="/logout"
                        method="post"
                        className="hover:underline"
                    >
                        Logout
                    </Link>
                </div>
            </header>

            {/* Contenu principal */}
            <main className="container mx-auto p-4">
                {children}
            </main>
        </div>
    );
}

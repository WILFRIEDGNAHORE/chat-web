import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Public Sans', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                chatvia: {
                    primary: '#7269ef',
                    'primary-hover': '#5f54e8',
                    info: '#50a5f1',
                    success: '#06d6a0',
                    warning: '#ffd166',
                    danger: '#ef476f',
                    muted: '#7a7f9a',
                    sidebar: '#f5f7fb',
                    'sidebar-dark': '#36404a',
                    dark: '#303841',
                    'dark-bg': '#262e35',
                    'dark-card': '#313a43',
                },
            },
            width: {
                'sidebar': '75px',
                'chatlist': '380px',
            },
            minWidth: {
                'sidebar': '75px',
                'chatlist': '380px',
            },
            maxWidth: {
                'chatlist': '380px',
            },
        },
    },

    plugins: [forms],
};

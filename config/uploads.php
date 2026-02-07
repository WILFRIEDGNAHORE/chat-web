<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Upload Disk
    |--------------------------------------------------------------------------
    |
    | Disk utilisé pour stocker les fichiers uploadés (photos, icônes, etc.)
    | Peut être 'public' (local) ou 'wasabi' (cloud)
    |
    */
    'disk' => env('UPLOADS_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Upload Paths
    |--------------------------------------------------------------------------
    |
    | Chemins de stockage pour différents types de fichiers
    |
    */
    'paths' => [
        'artisans' => [
            'photos' => 'artisans/photos',
        ],
        'btp' => [
            'quotes' => 'btp/quotes',
            'images' => 'btp/requests/images',
        ],
        'metiers' => [
            'icons' => 'metiers/icons',
        ],
        'projets' => [
            'images' => 'projets/images',
        ],
        'chat' => [
            'images' => 'chat/images',
            'files' => 'chat/files',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | File Validation
    |--------------------------------------------------------------------------
    |
    | Règles de validation pour les uploads
    |
    */
    'validation' => [
        'images' => [
            'max_size' => 5120, // 5MB en KB
            'mime_types' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            'extensions' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        ],
        'pdfs' => [
            'max_size' => env('BTP_QUOTE_PDF_MAX_SIZE_KB', 10240),
            'mime_types' => ['application/pdf'],
            'extensions' => ['pdf'],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Image Optimization
    |--------------------------------------------------------------------------
    |
    | Paramètres de redimensionnement et compression des images
    |
    */
    'optimization' => [
        'max_width' => 1920,
        'max_height' => 1920,
        'quality' => 80,
        'thumbnail' => [
            'width' => 400,
            'height' => 400,
        ],
    ],
];

<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class UploadService
{
    /**
     * Disque de stockage configuré
     */
    protected string $disk;

    public function __construct()
    {
        $this->disk = config('uploads.disk', 'public');
    }

    /**
     * Upload un fichier image avec optimisation (redimensionnement + compression + thumbnail)
     */
    public function uploadImage(UploadedFile $file, string $path, ?string $oldPath = null): string
    {
        // Supprimer l'ancien fichier et son thumbnail si fourni
        if ($oldPath && $this->exists($oldPath)) {
            $this->delete($oldPath);
            $this->deleteThumbnail($oldPath);
        }

        // Générer un nom unique
        $filename = $this->generateUniqueFilename($file);
        $fullPath = $path . '/' . $filename;

        $config = config('uploads.optimization');
        $maxWidth = $config['max_width'] ?? 1920;
        $maxHeight = $config['max_height'] ?? 1920;
        $quality = $config['quality'] ?? 80;

        try {
            // Optimiser l'image : redimensionner si nécessaire et compresser
            $manager = new ImageManager(new Driver());
            $image = $manager->read($file->getRealPath());

            // Redimensionner si l'image dépasse les dimensions max (en gardant le ratio)
            $image->scaleDown($maxWidth, $maxHeight);

            // Encoder avec compression
            $encoded = $image->encodeByExtension($file->getClientOriginalExtension(), quality: $quality);

            // Stocker l'image optimisée
            Storage::disk($this->disk)->put($fullPath, (string) $encoded);

            // Générer et stocker le thumbnail
            $this->generateThumbnail($file->getRealPath(), $path, $filename);
        } catch (\Exception $e) {
            // Fallback : stocker le fichier original sans optimisation
            Storage::disk($this->disk)->putFileAs($path, $file, $filename);
        }

        return $fullPath;
    }

    /**
     * Générer un thumbnail pour une image
     */
    protected function generateThumbnail(string $sourcePath, string $storagePath, string $filename): void
    {
        $config = config('uploads.optimization.thumbnail');
        $width = $config['width'] ?? 400;
        $height = $config['height'] ?? 400;

        try {
            $manager = new ImageManager(new Driver());
            $thumb = $manager->read($sourcePath);
            $thumb->cover($width, $height);

            $extension = pathinfo($filename, PATHINFO_EXTENSION);
            $encoded = $thumb->encodeByExtension($extension, quality: 70);

            $thumbPath = $storagePath . '/thumbnails/' . $filename;
            Storage::disk($this->disk)->put($thumbPath, (string) $encoded);
        } catch (\Exception $e) {
            // Silently fail - thumbnail is not critical
        }
    }

    /**
     * Supprimer le thumbnail associé à une image
     */
    protected function deleteThumbnail(string $path): void
    {
        $dir = dirname($path);
        $filename = basename($path);
        $thumbPath = $dir . '/thumbnails/' . $filename;

        if ($this->exists($thumbPath)) {
            $this->delete($thumbPath);
        }
    }

    public function uploadFile(UploadedFile $file, string $path, ?string $oldPath = null): string
    {
        if ($oldPath && $this->exists($oldPath)) {
            $this->delete($oldPath);
        }

        $filename = $this->generateUniqueFilename($file);
        $fullPath = $path . '/' . $filename;

        Storage::disk($this->disk)->putFileAs($path, $file, $filename);

        return $fullPath;
    }

    /**
     * Obtenir l'URL publique d'un fichier
     */
    public function url(string $path): string
    {
        return Storage::disk($this->disk)->url($path);
    }

    /**
     * Obtenir l'URL du thumbnail d'une image
     */
    public function thumbnailUrl(string $path): ?string
    {
        $dir = dirname($path);
        $filename = basename($path);
        $thumbPath = $dir . '/thumbnails/' . $filename;

        if ($this->exists($thumbPath)) {
            return Storage::disk($this->disk)->url($thumbPath);
        }

        // Fallback sur l'image originale
        return $this->url($path);
    }

    /**
     * Vérifier si un fichier existe
     */
    public function exists(string $path): bool
    {
        return Storage::disk($this->disk)->exists($path);
    }

    /**
     * Supprimer un fichier
     */
    public function delete(string $path): bool
    {
        return Storage::disk($this->disk)->delete($path);
    }

    /**
     * Générer un nom de fichier unique
     */
    protected function generateUniqueFilename(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        return Str::uuid() . '.' . $extension;
    }

    /**
     * Obtenir le disque configuré
     */
    public function getDisk(): string
    {
        return $this->disk;
    }

    /**
     * Valider un fichier image
     */
    public function validateImage(UploadedFile $file): array
    {
        $errors = [];
        $config = config('uploads.validation.images');

        // Vérifier la taille
        if ($file->getSize() > ($config['max_size'] * 1024)) {
            $errors[] = "Le fichier ne doit pas dépasser " . ($config['max_size'] / 1024) . " MB";
        }

        // Vérifier le type MIME
        if (!in_array($file->getMimeType(), $config['mime_types'])) {
            $errors[] = "Type de fichier non autorisé. Formats acceptés : " . implode(', ', $config['extensions']);
        }

        return $errors;
    }

    public function validatePdf(UploadedFile $file): array
    {
        $errors = [];
        $config = config('uploads.validation.pdfs');

        if ($file->getSize() > ($config['max_size'] * 1024)) {
            $errors[] = "Le fichier ne doit pas dépasser " . ($config['max_size'] / 1024) . " MB";
        }

        if (!in_array($file->getMimeType(), $config['mime_types'])) {
            $errors[] = "Type de fichier non autorisé. Formats acceptés : " . implode(', ', $config['extensions']);
        }

        return $errors;
    }
}

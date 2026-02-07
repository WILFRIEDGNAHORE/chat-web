<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->uuid('id')->primary();

            $table->string('type')->default('private'); // private | group
            $table->string('name')->nullable();         // pour les groupes

            $table->timestamps();

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};

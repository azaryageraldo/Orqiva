<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channels', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('workflow_id')
                ->nullable()
                ->constrained('workflows')
                ->nullOnDelete();

            $table->string('type')->default('widget');
            $table->string('name');
            $table->string('public_token', 64)->unique();
            $table->json('settings')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channels');
    }
};

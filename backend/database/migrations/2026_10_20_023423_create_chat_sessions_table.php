<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_sessions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('channel_id')
                ->constrained('channels')
                ->cascadeOnDelete();

            $table->foreignId('contact_id')
                ->constrained('contacts')
                ->cascadeOnDelete();

            $table->foreignId('workflow_id')
                ->constrained('workflows')
                ->cascadeOnDelete();

            $table->string('public_token', 64)->unique();
            $table->string('status')->default('active');
            $table->json('context')->nullable();
            $table->foreignId('current_workflow_id')
                ->nullable()
                ->constrained('workflows')
                ->nullOnDelete();
            $table->string('current_node_id')->nullable();
            $table->timestamp('takeover_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['contact_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_sessions');
    }
};

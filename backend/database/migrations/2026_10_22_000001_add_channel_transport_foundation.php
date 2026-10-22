<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->string('external_id', 191)->nullable()->after('public_token');
            $table->text('credentials')->nullable()->after('settings');
            $table->timestamp('last_connected_at')->nullable()->after('is_active');
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->string('delivery_status', 24)->nullable()->after('content');
            $table->string('external_message_id', 191)->nullable()->after('delivery_status');
            $table->text('delivery_error')->nullable()->after('external_message_id');
            $table->json('attachments')->nullable()->after('delivery_error');

            $table->index(['chat_session_id', 'external_message_id']);
        });

        Schema::create('contact_channels', function (Blueprint $table) {
            $table->id();

            $table->foreignId('contact_id')
                ->constrained('contacts')
                ->cascadeOnDelete();

            $table->foreignId('channel_id')
                ->constrained('channels')
                ->cascadeOnDelete();

            $table->string('external_id', 191);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['channel_id', 'external_id']);
            $table->index(['contact_id', 'channel_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_channels');

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropIndex(['chat_session_id', 'external_message_id']);
            $table->dropColumn([
                'delivery_status',
                'external_message_id',
                'delivery_error',
                'attachments',
            ]);
        });

        Schema::table('channels', function (Blueprint $table) {
            $table->dropColumn(['external_id', 'credentials', 'last_connected_at']);
        });
    }
};

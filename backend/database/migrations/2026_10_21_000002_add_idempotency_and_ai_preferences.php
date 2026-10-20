<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->string('client_message_id', 100)
                ->nullable()
                ->after('content');

            $table->unique(
                ['chat_session_id', 'client_message_id'],
                'chat_messages_session_client_unique'
            );
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('ai_reply_debounce_ms')
                ->default(0)
                ->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropUnique('chat_messages_session_client_unique');
            $table->dropColumn('client_message_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('ai_reply_debounce_ms');
        });
    }
};

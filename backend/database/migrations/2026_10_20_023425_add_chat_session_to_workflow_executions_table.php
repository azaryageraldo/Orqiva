<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workflow_executions', function (Blueprint $table) {
            $table->foreignId('chat_session_id')
                ->nullable()
                ->after('workflow_id')
                ->constrained('chat_sessions')
                ->nullOnDelete();

            $table->foreignId('contact_id')
                ->nullable()
                ->after('chat_session_id')
                ->constrained('contacts')
                ->nullOnDelete();

            $table->foreignId('current_workflow_id')
                ->nullable()
                ->after('current_node_id')
                ->constrained('workflows')
                ->nullOnDelete();

            $table->unique('chat_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('workflow_executions', function (Blueprint $table) {
            $table->dropUnique(['chat_session_id']);
            $table->dropConstrainedForeignId('current_workflow_id');
            $table->dropConstrainedForeignId('contact_id');
            $table->dropConstrainedForeignId('chat_session_id');
        });
    }
};

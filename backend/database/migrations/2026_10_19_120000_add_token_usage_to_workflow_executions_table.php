<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('workflow_executions', function (Blueprint $table) {
            $table->unsignedInteger('prompt_tokens')
                ->nullable()
                ->after('logs');
            $table->unsignedInteger('completion_tokens')
                ->nullable()
                ->after('prompt_tokens');
            $table->unsignedInteger('total_tokens')
                ->nullable()
                ->after('completion_tokens');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('workflow_executions', function (Blueprint $table) {
            $table->dropColumn([
                'prompt_tokens',
                'completion_tokens',
                'total_tokens',
            ]);
        });
    }
};

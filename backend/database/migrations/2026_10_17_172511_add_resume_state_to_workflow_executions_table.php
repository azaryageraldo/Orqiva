<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workflow_executions', function (Blueprint $table) {
            $table->string('current_node_id')->nullable();
            $table->json('context')->nullable();
            $table->timestamp('waiting_since')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('workflow_executions', function (Blueprint $table) {
            $table->dropColumn([
                'current_node_id',
                'context',
                'waiting_since',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workflow_execution_steps', function (Blueprint $table) {
            $table->foreignId('workflow_id')
                ->nullable()
                ->after('workflow_execution_id')
                ->constrained('workflows')
                ->nullOnDelete();

            $table->string('workflow_name')->nullable()->after('workflow_id');
        });
    }

    public function down(): void
    {
        Schema::table('workflow_execution_steps', function (Blueprint $table) {
            $table->dropConstrainedForeignId('workflow_id');
            $table->dropColumn('workflow_name');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_execution_steps', function (Blueprint $table) {
            $table->id();

            $table->foreignId('workflow_execution_id')
                ->constrained('workflow_executions')
                ->cascadeOnDelete();

            $table->unsignedInteger('step');
            $table->string('node_id');
            $table->string('node_type');
            $table->string('node_name')->nullable();
            $table->string('status')->default('success');

            $table->json('input')->nullable();
            $table->json('output')->nullable();
            $table->json('variables')->nullable();
            $table->string('branch')->nullable();
            $table->json('messages')->nullable();

            $table->unsignedInteger('duration_ms')->default(0);
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);

            $table->text('error')->nullable();
            $table->timestamp('executed_at');
            $table->timestamps();

            $table->index(['workflow_execution_id', 'step']);
            $table->index(['node_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_execution_steps');
    }
};

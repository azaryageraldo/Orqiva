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
    Schema::create('workflow_executions', function (Blueprint $table) {
        $table->id();

        $table->foreignId('workflow_id')
            ->constrained('workflows')
            ->cascadeOnDelete();

        $table->string('status')->default('pending');
        $table->json('input')->nullable();
        $table->json('output')->nullable();
        $table->json('logs')->nullable();
        $table->text('error')->nullable();
        $table->timestamp('started_at')->nullable();
        $table->timestamp('finished_at')->nullable();

        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_executions');
    }
};

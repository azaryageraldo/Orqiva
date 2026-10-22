<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->bigInteger('polling_offset')->nullable()->after('last_connected_at');
            $table->text('last_error')->nullable()->after('polling_offset');
        });
    }

    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropColumn(['polling_offset', 'last_error']);
        });
    }
};

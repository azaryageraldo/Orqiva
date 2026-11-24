<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function (): void {
    $this->comment('Build workflows that move work forward.');
})->purpose('Display a short Orqiva message');

Schedule::command('sessions:auto-resolve')->hourly();
Schedule::command('orqiva:prune')->daily();

<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function (): void {
    $this->comment('Build workflows that move work forward.');
})->purpose('Display a short FlowPilot message');

<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SpaController extends Controller
{
    public function __invoke(): BinaryFileResponse
    {
        $index = public_path('app.html');

        abort_unless(
            File::exists($index),
            404,
            'Frontend Orqiva belum dibangun. Jalankan build frontend terlebih dahulu.'
        );

        return response()->file($index, [
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }
}

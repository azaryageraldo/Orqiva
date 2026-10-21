<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        /*
         * API ini tidak memiliki route login berbasis web, jadi
         * permintaan tanpa autentikasi dijawab 401 alih-alih
         * dialihkan ke route login yang tidak ada.
         */
        $middleware->redirectGuestsTo(null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();

$dataDir = getenv('ORQIVA_DATA_DIR') ?: ($_ENV['ORQIVA_DATA_DIR'] ?? null);

if (is_string($dataDir) && $dataDir !== '') {
    $dataDir = rtrim($dataDir, '/\\');
    $storagePath = $dataDir.DIRECTORY_SEPARATOR.'storage';

    $directories = [
        $storagePath,
        $storagePath.DIRECTORY_SEPARATOR.'app',
        $storagePath.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'public',
        $storagePath.DIRECTORY_SEPARATOR.'framework',
        $storagePath.DIRECTORY_SEPARATOR.'framework'.DIRECTORY_SEPARATOR.'cache',
        $storagePath.DIRECTORY_SEPARATOR.'framework'.DIRECTORY_SEPARATOR.'sessions',
        $storagePath.DIRECTORY_SEPARATOR.'framework'.DIRECTORY_SEPARATOR.'views',
        $storagePath.DIRECTORY_SEPARATOR.'logs',
        $dataDir.DIRECTORY_SEPARATOR.'data',
    ];

    foreach ($directories as $directory) {
        if (! is_dir($directory) && ! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new RuntimeException(
                'Tidak dapat membuat direktori data Orqiva: '.$directory
            );
        }
    }

    $app->useEnvironmentPath($dataDir);
    $app->useStoragePath($storagePath);
}

return $app;

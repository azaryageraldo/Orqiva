<?php

use App\Http\Controllers\Api\WorkflowController;
use App\Http\Controllers\Api\WorkflowExecutionController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

    Route::prefix('v1')->group(function () {
        Route::get('/health', static fn () => response()->json([
            'data' => [
                'status' => 'ok',
                'service' => 'flowpilot-api',
            ],
        ]));

        Route::apiResource('workflows', WorkflowController::class);

    Route::get(
        '/workflows/{workflow}/executions',
        [WorkflowExecutionController::class, 'index']
    );

    Route::post(
        '/workflows/{workflow}/execute',
        [WorkflowExecutionController::class, 'execute']
    );

    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');

    });

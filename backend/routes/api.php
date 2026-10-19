<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UsageStatsController;
use App\Http\Controllers\Api\WorkflowController;
use App\Http\Controllers\Api\WorkflowExecutionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', static fn () => response()->json([
        'data' => [
            'status' => 'ok',
            'service' => 'flowpilot-api',
        ],
    ]));

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::apiResource('workflows', WorkflowController::class);

        Route::get(
            '/workflows/{workflow}/executions',
            [WorkflowExecutionController::class, 'index']
        );

        Route::get(
            '/workflows/{workflow}/executions/{execution}',
            [WorkflowExecutionController::class, 'show']
        );

        Route::post(
            '/workflows/{workflow}/execute',
            [WorkflowExecutionController::class, 'execute']
        )->middleware('throttle:30,1');

        Route::get(
            '/stats/token-usage',
            [UsageStatsController::class, 'tokenUsage']
        );

        Route::get(
            '/stats/activity',
            [UsageStatsController::class, 'activity']
        );
    });
});

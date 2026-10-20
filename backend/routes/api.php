<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChannelController;
use App\Http\Controllers\Api\InboxController;
use App\Http\Controllers\Api\PublicChatController;
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
        ->middleware('throttle:login');

    Route::prefix('public')->group(function () {
        Route::get('/channels/{token}', [PublicChatController::class, 'showChannel']);
        Route::post('/channels/{token}/sessions', [PublicChatController::class, 'start'])
            ->middleware('throttle:public-start');
        Route::get('/sessions/{token}', [PublicChatController::class, 'messages'])
            ->middleware('throttle:public-poll');
        Route::post('/sessions/{token}/messages', [PublicChatController::class, 'send'])
            ->middleware('throttle:public-send');
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::get('/workflow-options', [WorkflowController::class, 'options']);

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
        )->middleware('throttle:workflow-execute');

        Route::get('/inbox', [InboxController::class, 'index']);
        Route::get('/inbox/contacts/{contact}', [InboxController::class, 'show']);
        Route::post('/inbox/sessions/{session}/takeover', [InboxController::class, 'takeover']);
        Route::post('/inbox/sessions/{session}/release', [InboxController::class, 'release']);
        Route::post('/inbox/sessions/{session}/messages', [InboxController::class, 'reply']);

        Route::get('/channel', [ChannelController::class, 'show']);
        Route::put('/channel', [ChannelController::class, 'update']);
        Route::post('/channel/regenerate', [ChannelController::class, 'regenerate']);

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

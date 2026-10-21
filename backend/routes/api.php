<?php

use App\Http\Controllers\Api\AiSettingsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChannelController;
use App\Http\Controllers\Api\InboxController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PublicChatController;
use App\Http\Controllers\Api\UsageStatsController;
use App\Http\Controllers\Api\WorkflowController;
use App\Http\Controllers\Api\WorkflowExecutionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', static fn () => response()->json([
        'data' => [
            'status' => 'ok',
            'service' => 'orqiva-api',
        ],
    ]));

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::prefix('public')->group(function () {
        Route::get('/channels/{token}', [PublicChatController::class, 'showChannel']);
        Route::get('/channels/{token}/embed-config.js', [PublicChatController::class, 'embedConfig'])
            ->middleware('throttle:public-poll');
        Route::get('/channels/{token}/icon/{kind}', [PublicChatController::class, 'icon'])
            ->middleware('throttle:public-poll');
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
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);

        Route::get('/ai-settings', [AiSettingsController::class, 'show']);
        Route::put('/ai-settings', [AiSettingsController::class, 'update']);
        Route::post('/ai-settings/detect-models', [AiSettingsController::class, 'detectModels']);
        Route::delete('/ai-settings/providers/{provider}', [AiSettingsController::class, 'destroy']);

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
        Route::post('/channel/icon', [ChannelController::class, 'uploadIcon']);
        Route::delete('/channel/icon/{kind}', [ChannelController::class, 'deleteIcon']);
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

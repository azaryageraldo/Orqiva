<?php

use App\Http\Controllers\Api\AiSettingsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChannelController;
use App\Http\Controllers\Api\InboxController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PublicChatController;
use App\Http\Controllers\Api\SetupController;
use App\Http\Controllers\Api\TelegramWebhookController;
use App\Http\Controllers\Api\UsageStatsController;
use App\Http\Controllers\Api\WorkflowController;
use App\Http\Controllers\Api\WorkflowExecutionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', static function () {
        $queueDriver = config('queue.default');
        $pendingJobs = 0;
        $stalledJobs = 0;

        if ($queueDriver === 'database' && \Illuminate\Support\Facades\Schema::hasTable('jobs')) {
            $pendingJobs = \Illuminate\Support\Facades\DB::table('jobs')->count();
            $stalledJobs = \Illuminate\Support\Facades\DB::table('jobs')
                ->where('created_at', '<', now()->subMinutes(2)->timestamp)
                ->count();
        }

        return response()->json([
            'data' => [
                'status' => 'ok',
                'service' => 'orqiva-api',
                'queue' => [
                    'driver' => $queueDriver,
                    'pending_jobs' => $pendingJobs,
                    'stalled_jobs' => $stalledJobs,
                    'worker_status' => $stalledJobs > 0 ? 'stalled' : 'idle',
                ],
            ],
        ]);
    });

    Route::get('/setup/status', [SetupController::class, 'status'])
        ->middleware('throttle:setup');

    Route::post('/setup', [SetupController::class, 'store'])
        ->middleware('throttle:setup');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware([
            'throttle:login',
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
        ]);

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
        Route::post('/telegram/{token}/webhook', [TelegramWebhookController::class, 'handle'])
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

        Route::get('/workflows/{workflow}/export', [WorkflowController::class, 'export']);
        Route::post('/workflows/import', [WorkflowController::class, 'import']);

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

        Route::get('/channels', [ChannelController::class, 'index']);
        Route::post('/channels', [ChannelController::class, 'store']);
        Route::put('/channels/{channel}', [ChannelController::class, 'update']);
        Route::delete('/channels/{channel}', [ChannelController::class, 'destroy']);
        Route::post('/channels/{channel}/regenerate', [ChannelController::class, 'regenerate']);
        Route::get('/channels/{channel}/telegram/webhook', [ChannelController::class, 'getTelegramWebhook']);
        Route::post('/channels/{channel}/telegram/webhook', [ChannelController::class, 'manageTelegramWebhook']);

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

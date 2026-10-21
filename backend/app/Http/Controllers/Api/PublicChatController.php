<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\ChatSession;
use App\Services\Conversations\ConversationOrchestrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PublicChatController extends Controller
{
    private const DEFAULT_APPEARANCE = [
        'header_color' => '#17212b',
        'background_color' => '#0e1621',
        'outgoing_color' => '#2b5278',
        'accent_color' => '#64b5ef',
    ];

    public function __construct(
        private readonly ConversationOrchestrator $orchestrator
    ) {}

    public function showChannel(string $token): JsonResponse
    {
        $channel = $this->resolveChannel($token);

        return response()->json([
            'data' => $this->channelPayload($channel),
        ]);
    }

    public function embedConfig(string $token)
    {
        $channel = $this->resolveChannel($token);
        $settings = $this->publicSettings($channel);
        $config = [
            'mode' => $settings['open_mode'],
            'name' => $channel->name,
            'accent' => $settings['appearance']['accent_color'],
            'icon' => $this->iconUrl($channel, 'launcher'),
            'active' => (bool) $channel->is_active,
        ];

        $json = json_encode(
            $config,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ) ?: '{}';
        $key = json_encode($token) ?: '""';
        $script = 'window.OrqivaEmbedConfig=window.OrqivaEmbedConfig||{};'
            .'window.OrqivaEmbedConfig['.$key.']='.$json.';';

        return response($script, 200, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Cache-Control' => 'public, max-age=60',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function icon(string $token, string $kind)
    {
        abort_unless(in_array($kind, ['chat', 'launcher'], true), 404);

        $channel = Channel::query()
            ->where('public_token', $token)
            ->first();

        abort_if($channel === null, 404);

        $settings = $this->normalizeSettings($channel->settings ?? []);
        $path = $settings['icons'][$kind] ?? null;

        abort_unless(is_string($path) && $path !== '', 404);

        $disk = Storage::disk('public');

        abort_unless($disk->exists($path), 404);

        return response()->file($disk->path($path), [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function start(Request $request, string $token): JsonResponse
    {
        $channel = $this->resolveChannel($token);

        $validated = $request->validate([
            'contact_id' => ['nullable', 'string', 'max:100'],
        ]);

        $result = $this->orchestrator->startSession(
            $channel,
            $validated['contact_id'] ?? null
        );

        $contact = $result['contact'];
        $session = $result['session'];

        return response()->json([
            'data' => array_replace($this->orchestrator->state($session), [
                'status' => $session->status,
                'contact_id' => $contact->public_id,
                'session_token' => $session->public_token,
                'channel' => $this->channelPayload($channel),
            ]),
        ], 201);
    }

    public function messages(string $sessionToken): JsonResponse
    {
        $session = $this->session($sessionToken);

        return response()->json([
            'data' => array_replace($this->orchestrator->state($session), [
                'status' => $session->status,
                'contact_id' => $session->contact?->public_id,
                'session_token' => $session->public_token,
                'channel' => $this->channelPayload($session->channel),
            ]),
        ]);
    }

    public function send(Request $request, string $sessionToken): JsonResponse
    {
        $session = $this->session($sessionToken);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
            'client_message_id' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        $text = trim($validated['message']);

        if ($text === '') {
            throw ValidationException::withMessages([
                'message' => 'Pesan tidak boleh kosong.',
            ]);
        }

        $clientMessageId = trim((string) ($validated['client_message_id'] ?? ''));

        $result = $this->orchestrator->enqueueMessage(
            $session,
            $text,
            $clientMessageId !== '' ? $clientMessageId : null
        );

        return response()->json([
            'data' => $result['state'],
        ]);
    }

    private function resolveChannel(string $token): Channel
    {
        $channel = Channel::query()
            ->where('public_token', $token)
            ->with('workflow:id,name,status,definition')
            ->first();

        abort_if($channel === null, 404);

        return $channel;
    }

    private function session(string $token): ChatSession
    {
        $session = ChatSession::query()
            ->where('public_token', $token)
            ->with(['channel.workflow:id,name,status', 'contact', 'workflow'])
            ->first();

        abort_if($session === null, 404);

        return $session;
    }

    /**
     * @return array<string, mixed>
     */
    private function channelPayload(?Channel $channel): array
    {
        if ($channel === null) {
            return [];
        }

        return [
            'name' => $channel->name,
            'is_active' => (bool) $channel->is_active,
            'settings' => $this->publicSettings($channel),
            'icon_urls' => [
                'chat' => $this->iconUrl($channel, 'chat'),
                'launcher' => $this->iconUrl($channel, 'launcher'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function publicSettings(Channel $channel): array
    {
        $settings = $this->normalizeSettings($channel->settings ?? []);

        return [
            'welcome_message' => $settings['welcome_message'],
            'placeholder' => $settings['placeholder'],
            'open_mode' => $settings['open_mode'],
            'appearance' => $settings['appearance'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeSettings(array $settings): array
    {
        $appearance = is_array($settings['appearance'] ?? null)
            ? $settings['appearance']
            : [];
        $icons = is_array($settings['icons'] ?? null)
            ? $settings['icons']
            : [];

        foreach (self::DEFAULT_APPEARANCE as $key => $default) {
            if (
                ! isset($appearance[$key])
                || ! is_string($appearance[$key])
                || preg_match('/^#[0-9a-fA-F]{6}$/', $appearance[$key]) !== 1
            ) {
                $appearance[$key] = $default;
            }
        }

        return [
            'welcome_message' => (string) ($settings['welcome_message'] ?? ''),
            'placeholder' => (string) ($settings['placeholder'] ?? ''),
            'open_mode' => in_array(
                $settings['open_mode'] ?? null,
                ['manual', 'always'],
                true
            ) ? $settings['open_mode'] : 'manual',
            'appearance' => $appearance,
            'icons' => [
                'chat' => is_string($icons['chat'] ?? null)
                    ? $icons['chat']
                    : null,
                'launcher' => is_string($icons['launcher'] ?? null)
                    ? $icons['launcher']
                    : null,
            ],
        ];
    }

    private function iconUrl(Channel $channel, string $kind): ?string
    {
        $settings = $this->normalizeSettings($channel->settings ?? []);
        $path = $settings['icons'][$kind] ?? null;

        if (! is_string($path) || $path === '') {
            return null;
        }

        return '/api/v1/public/channels/'
            .$channel->public_token
            .'/icon/'
            .$kind
            .'?v='
            .($channel->updated_at?->timestamp ?? time());
    }
}

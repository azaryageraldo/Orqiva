<?php

namespace App\Services\Channels;

use App\Models\Channel;
use App\Models\User;
use App\Models\Workflow;
use App\Services\Channels\Telegram\TelegramClient;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class ChannelService
{
    public const DEFAULT_APPEARANCE = [
        'header_color' => '#17212b',
        'background_color' => '#0e1621',
        'outgoing_color' => '#2b5278',
        'accent_color' => '#64b5ef',
    ];

    public const ICON_KINDS = ['chat', 'launcher'];

    public function __construct(
        private readonly TelegramClient $telegram
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getChannels(User $user): array
    {
        $channels = Channel::query()
            ->where('user_id', $user->id)
            ->with('workflow:id,name,status')
            ->orderBy('id')
            ->get();

        return $channels
            ->map(fn (Channel $channel) => $this->serialize($channel))
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function createChannel(User $user, array $validated): array
    {
        $type = $validated['type'] ?? Channel::TYPE_WIDGET;
        $botToken = trim((string) ($validated['bot_token'] ?? ''));
        $bot = null;

        if ($type === Channel::TYPE_WIDGET && $botToken !== '') {
            throw ValidationException::withMessages([
                'bot_token' => 'Token bot hanya dipakai channel Telegram.',
            ]);
        }

        if ($type === Channel::TYPE_TELEGRAM) {
            if ($botToken === '') {
                throw ValidationException::withMessages([
                    'bot_token' => 'Token bot Telegram wajib diisi.',
                ]);
            }

            $bot = $this->validatedTelegramBot($botToken);
        }

        $exists = Channel::query()
            ->where('user_id', $user->id)
            ->where('type', $type)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'type' => 'Channel tipe ini sudah ada. Ubah channel tersebut atau hapus dulu.',
            ]);
        }

        $workflow = null;

        if (($validated['workflow_id'] ?? null) !== null) {
            $workflow = $this->ownedEntryWorkflow(
                $user,
                (int) $validated['workflow_id']
            );
        }

        if (($validated['is_active'] ?? false) === true && $workflow === null) {
            throw ValidationException::withMessages([
                'workflow_id' => 'Pilih workflow entry sebelum mengaktifkan channel.',
            ]);
        }

        $channel = Channel::create([
            'user_id' => $user->id,
            'workflow_id' => $workflow?->id,
            'type' => $type,
            'name' => $validated['name'],
            'public_token' => Str::random(48),
            'external_id' => $bot === null ? null : $this->botHandle($bot),
            'credentials' => $bot === null ? null : ['bot_token' => $botToken],
            'is_active' => (bool) ($validated['is_active'] ?? false),
            'last_connected_at' => $bot === null ? null : now(),
            'settings' => $this->defaultSettings($type),
        ]);

        return $this->serialize($channel->fresh(['workflow']));
    }

    /**
     * @return array<string, mixed>
     */
    public function getWidgetChannel(User $user): array
    {
        return $this->serialize($this->channelFor($user));
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function updateChannel(User $user, Channel $channel, array $validated): array
    {
        $this->authorizeChannel($user, $channel);

        $botToken = trim((string) ($validated['bot_token'] ?? ''));

        if (array_key_exists('bot_token', $validated)) {
            unset($validated['bot_token']);

            if ($channel->type !== Channel::TYPE_TELEGRAM) {
                throw ValidationException::withMessages([
                    'bot_token' => 'Token bot hanya dipakai channel Telegram.',
                ]);
            }

            if ($botToken === '') {
                throw ValidationException::withMessages([
                    'bot_token' => 'Token bot Telegram wajib diisi.',
                ]);
            }

            $bot = $this->validatedTelegramBot($botToken);

            $validated['credentials'] = ['bot_token' => $botToken];
            $validated['external_id'] = $this->botHandle($bot);
            $validated['last_connected_at'] = now();
            $validated['last_error'] = null;
        }

        if (
            array_key_exists('workflow_id', $validated)
            && $validated['workflow_id'] !== null
        ) {
            $this->ownedEntryWorkflow($user, (int) $validated['workflow_id']);
        }

        if (
            ($validated['is_active'] ?? false) === true
            && $channel->workflow_id === null
            && ! isset($validated['workflow_id'])
        ) {
            throw ValidationException::withMessages([
                'workflow_id' => 'Pilih workflow entry sebelum mengaktifkan widget.',
            ]);
        }

        if (array_key_exists('settings', $validated)) {
            $incoming = is_array($validated['settings']) ? $validated['settings'] : [];

            $validated['settings'] = $channel->type === Channel::TYPE_WIDGET
                ? $this->mergeSettings($channel->settings ?? [], $incoming)
                : array_replace($channel->settings ?? [], $incoming);
        }

        $channel->update($validated);

        return $this->serialize($channel->fresh(['workflow']));
    }

    public function deleteChannel(User $user, Channel $channel): void
    {
        $this->authorizeChannel($user, $channel);

        $channel->delete();
    }

    /**
     * @return array<string, mixed>
     */
    public function uploadIcon(User $user, Channel $channel, string $kind, UploadedFile $file): array
    {
        $this->authorizeChannel($user, $channel);

        $stored = $this->storeIcon($channel, $file);
        $settings = $this->normalizeSettings($channel->settings ?? []);
        $previous = $settings['icons'][$kind] ?? null;

        if (is_string($previous) && $previous !== '') {
            Storage::disk('public')->delete($previous);
        }

        $settings['icons'][$kind] = $stored;
        $channel->update(['settings' => $settings]);

        return $this->serialize($channel->fresh(['workflow']));
    }

    /**
     * @return array<string, mixed>
     */
    public function deleteIcon(User $user, Channel $channel, string $kind): array
    {
        $this->authorizeChannel($user, $channel);

        abort_unless(in_array($kind, self::ICON_KINDS, true), 404);

        $settings = $this->normalizeSettings($channel->settings ?? []);
        $previous = $settings['icons'][$kind] ?? null;

        if (is_string($previous) && $previous !== '') {
            Storage::disk('public')->delete($previous);
        }

        $settings['icons'][$kind] = null;
        $channel->update(['settings' => $settings]);

        return $this->serialize($channel->fresh(['workflow']));
    }

    /**
     * @return array<string, mixed>
     */
    public function regenerateToken(User $user, Channel $channel): array
    {
        $this->authorizeChannel($user, $channel);

        if ($channel->type !== Channel::TYPE_WIDGET) {
            throw ValidationException::withMessages([
                'channel' => 'Ganti token hanya berlaku untuk widget.',
            ]);
        }

        $channel->update([
            'public_token' => Str::random(48),
        ]);

        return $this->serialize($channel->fresh(['workflow']));
    }

    public function channelFor(User $user): Channel
    {
        return Channel::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'type' => Channel::TYPE_WIDGET,
            ],
            [
                'name' => 'Website Chat Widget',
                'public_token' => Str::random(48),
                'is_active' => false,
                'settings' => $this->normalizeSettings([]),
            ]
        );
    }

    public function authorizeChannel(User $user, Channel $channel): void
    {
        abort_unless($channel->user_id === $user->id, 404);
    }

    public function ownedEntryWorkflow(User $user, int $workflowId): Workflow
    {
        $workflow = Workflow::query()
            ->whereKey($workflowId)
            ->where('user_id', $user->id)
            ->first();

        if ($workflow === null) {
            throw ValidationException::withMessages([
                'workflow_id' => 'Workflow tidak ditemukan atau bukan milik akun ini.',
            ]);
        }

        $hasTrigger = collect(data_get($workflow->definition, 'nodes', []))
            ->contains(fn ($node) => is_array($node)
                && in_array($node['type'] ?? null, ['Trigger', 'trigger'], true));

        if (! $hasTrigger) {
            throw ValidationException::withMessages([
                'workflow_id' => 'Workflow entry harus memiliki satu node Trigger. Workflow lanjutan cukup diakses lewat Go To.',
            ]);
        }

        return $workflow;
    }

    /**
     * @return array<string, mixed>
     */
    public function validatedTelegramBot(string $token): array
    {
        try {
            $bot = $this->telegram->getMe($token);
            $this->telegram->deleteWebhook($token);
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'bot_token' => 'Token bot tidak valid: '.$exception->getMessage(),
            ]);
        }

        if (! is_array($bot) || ! isset($bot['id'])) {
            throw ValidationException::withMessages([
                'bot_token' => 'Token bot tidak valid.',
            ]);
        }

        return $bot;
    }

    /**
     * @param  array<string, mixed>  $bot
     */
    public function botHandle(array $bot): ?string
    {
        $username = trim((string) ($bot['username'] ?? ''));

        return $username !== '' ? '@'.$username : (string) $bot['id'];
    }

    /**
     * @return array<string, mixed>
     */
    public function defaultSettings(string $type): array
    {
        return $type === Channel::TYPE_WIDGET ? $this->normalizeSettings([]) : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function serialize(Channel $channel): array
    {
        $channel->loadMissing('workflow:id,name,status');

        return [
            'id' => $channel->id,
            'name' => $channel->name,
            'type' => $channel->type,
            'public_token' => $channel->public_token,
            'external_id' => $channel->external_id,
            'has_credentials' => $channel->getRawOriginal('credentials') !== null,
            'workflow_id' => $channel->workflow_id,
            'workflow_name' => $channel->workflow?->name,
            'is_active' => (bool) $channel->is_active,
            'settings' => $channel->type === Channel::TYPE_WIDGET
                ? $this->normalizeSettings($channel->settings ?? [])
                : ($channel->settings ?? []),
            'icon_urls' => [
                'chat' => $this->iconUrl($channel, 'chat'),
                'launcher' => $this->iconUrl($channel, 'launcher'),
            ],
            'last_connected_at' => $channel->last_connected_at?->toISOString(),
            'last_error' => $channel->last_error,
            'updated_at' => $channel->updated_at?->toISOString(),
        ];
    }

    public function storeIcon(Channel $channel, UploadedFile $file): string
    {
        $contents = file_get_contents($file->getRealPath());
        $source = is_string($contents) ? @imagecreatefromstring($contents) : false;

        if ($source === false) {
            throw ValidationException::withMessages([
                'icon' => 'Ikon tidak dapat dibaca. Gunakan PNG, JPG, atau WebP.',
            ]);
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $edge = max(1, min($width, $height));
        $sourceX = (int) floor(($width - $edge) / 2);
        $sourceY = (int) floor(($height - $edge) / 2);

        $target = imagecreatetruecolor(256, 256);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        imagefill($target, 0, 0, $transparent);
        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            $sourceX,
            $sourceY,
            256,
            256,
            $edge,
            $edge
        );

        imagedestroy($source);

        ob_start();
        imagepng($target);
        $png = ob_get_clean();
        imagedestroy($target);

        if (! is_string($png) || $png === '') {
            throw ValidationException::withMessages([
                'icon' => 'Ikon gagal diproses. Coba unggah ulang.',
            ]);
        }

        $path = 'channel-icons/'.$channel->user_id.'/'.Str::uuid().'.png';
        Storage::disk('public')->put($path, $png);

        return $path;
    }

    /**
     * @return array<string, mixed>
     */
    public function mergeSettings(array $current, array $incoming): array
    {
        $current = $this->normalizeSettings($current);
        $merged = array_replace($current, $incoming);
        $merged['appearance'] = array_replace(
            $current['appearance'],
            is_array($incoming['appearance'] ?? null) ? $incoming['appearance'] : []
        );
        $merged['icons'] = $current['icons'];

        return $this->normalizeSettings($merged);
    }

    /**
     * @return array<string, mixed>
     */
    public function normalizeSettings(array $settings): array
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
            'welcome_message' => array_key_exists('welcome_message', $settings)
                ? (string) ($settings['welcome_message'] ?? '')
                : 'Halo! Ada yang bisa kami bantu?',
            'placeholder' => array_key_exists('placeholder', $settings)
                ? (string) ($settings['placeholder'] ?? '')
                : 'Tulis pesan...',
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

    public function iconUrl(Channel $channel, string $kind): ?string
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


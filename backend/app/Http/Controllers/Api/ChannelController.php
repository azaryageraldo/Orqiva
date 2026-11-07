<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Services\Channels\ChannelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChannelController extends Controller
{
    public function __construct(
        private readonly ChannelService $channelService
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->channelService->getChannels($request->user()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['sometimes', 'string', Rule::in(Channel::TYPES)],
            'name' => ['required', 'string', 'max:120'],
            'workflow_id' => ['sometimes', 'nullable', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
            'bot_token' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]);

        $data = $this->channelService->createChannel($request->user(), $validated);

        return response()->json(['data' => $data], 201);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->channelService->getWidgetChannel($request->user()),
        ]);
    }

    public function update(Request $request, ?Channel $channel = null): JsonResponse
    {
        $channel ??= $this->channelService->channelFor($request->user());

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'workflow_id' => ['sometimes', 'nullable', 'integer', Rule::exists('workflows', 'id')],
            'is_active' => ['sometimes', 'boolean'],
            'settings' => ['sometimes', 'nullable', 'array'],
            'settings.welcome_message' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'settings.placeholder' => ['sometimes', 'nullable', 'string', 'max:160'],
            'settings.open_mode' => ['sometimes', Rule::in(['manual', 'always'])],
            'settings.appearance' => ['sometimes', 'array'],
            'settings.appearance.header_color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'settings.appearance.background_color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'settings.appearance.outgoing_color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'settings.appearance.accent_color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'bot_token' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]);

        $data = $this->channelService->updateChannel($request->user(), $channel, $validated);

        return response()->json(['data' => $data]);
    }

    public function destroy(Request $request, Channel $channel): JsonResponse
    {
        $this->channelService->deleteChannel($request->user(), $channel);

        return response()->json([
            'data' => ['deleted' => true],
        ]);
    }

    public function uploadIcon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kind' => ['required', Rule::in(ChannelService::ICON_KINDS)],
            'icon' => ['required', 'file', 'mimes:png,jpg,jpeg,webp', 'max:1024'],
        ]);

        $channel = $this->channelService->channelFor($request->user());
        $data = $this->channelService->uploadIcon(
            $request->user(),
            $channel,
            (string) $validated['kind'],
            $validated['icon']
        );

        return response()->json(['data' => $data]);
    }

    public function deleteIcon(Request $request, string $kind): JsonResponse
    {
        $channel = $this->channelService->channelFor($request->user());
        $data = $this->channelService->deleteIcon($request->user(), $channel, $kind);

        return response()->json(['data' => $data]);
    }

    public function regenerate(Request $request, ?Channel $channel = null): JsonResponse
    {
        $channel ??= $this->channelService->channelFor($request->user());
        $data = $this->channelService->regenerateToken($request->user(), $channel);

        return response()->json(['data' => $data]);
    }
}

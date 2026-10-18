<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkflowController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Workflow::query()
                ->latest()
                ->paginate(10),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'active'])],
            'definition' => ['nullable', 'array'],
        ]);

        $workflow = Workflow::create($validated);

        return response()->json(['data' => $workflow], 201);
    }

    public function show(Workflow $workflow): JsonResponse
    {
        return response()->json(['data' => $workflow]);
    }

    public function update(
        Request $request,
        Workflow $workflow
    ): JsonResponse {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'active'])],
            'definition' => ['sometimes', 'nullable', 'array'],
        ]);

        $workflow->update($validated);

        return response()->json([
            'data' => $workflow->fresh(),
        ]);
    }

    public function destroy(Workflow $workflow): JsonResponse
    {
        $workflow->delete();

        return response()->json([
            'message' => 'Workflow deleted successfully.',
        ]);
    }
}

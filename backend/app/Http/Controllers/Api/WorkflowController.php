<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use App\Services\Workflows\WorkflowGraphValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class WorkflowController extends Controller
{
    public function __construct(
        private readonly WorkflowGraphValidator $graphValidator
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $workflows = $request->user()
            ->workflows()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return response()->json(['data' => $workflows]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'active'])],
            'definition' => ['nullable', 'array'],
        ]);

        $this->assertDefinitionIsValid($validated['definition'] ?? null);

        $workflow = $request->user()->workflows()->create($validated);

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

        if (array_key_exists('definition', $validated)) {
            $this->assertDefinitionIsValid($validated['definition']);
        }

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

    /**
     * Validasi struktur graph saat workflow disimpan. Kelengkapan
     * (Trigger, Condition, jalur) baru diwajibkan ketika dieksekusi
     * agar draft yang belum selesai tetap bisa disimpan.
     */
    private function assertDefinitionIsValid(mixed $definition): void
    {
        if ($definition === null) {
            return;
        }

        if (! is_array($definition)) {
            throw ValidationException::withMessages([
                'definition' => 'Definition harus berupa object.',
            ]);
        }

        try {
            $this->graphValidator->validateDefinition(
                $definition,
                null,
                false
            );
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'definition' => $exception->getMessage(),
            ]);
        }
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use App\Services\Workflows\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkflowController extends Controller
{
    public function __construct(
        private readonly WorkflowService $workflowService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $result = $this->workflowService->getWorkflows(
            $request->user(),
            [
                'search' => $request->query('search', ''),
                'status' => $request->query('status', ''),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 10),
            ]
        );

        return response()->json(['data' => $result]);
    }

    public function options(Request $request): JsonResponse
    {
        $data = $this->workflowService->getWorkflowOptions($request->user());

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $workflow = $this->workflowService->createWorkflow(
            $request->user(),
            $request->only(['name', 'description', 'status', 'definition'])
        );

        return response()->json(['data' => $workflow], 201);
    }

    public function show(Request $request, Workflow $workflow): JsonResponse
    {
        $data = $this->workflowService->getWorkflow($request->user(), (int) $workflow->id);

        return response()->json(['data' => $data]);
    }

    public function update(Request $request, Workflow $workflow): JsonResponse
    {
        $data = $this->workflowService->updateWorkflow(
            $request->user(),
            (int) $workflow->id,
            $request->only(['name', 'description', 'status', 'definition'])
        );

        return response()->json([
            'data' => $data,
        ]);
    }

    public function destroy(Request $request, Workflow $workflow): JsonResponse
    {
        $this->workflowService->deleteWorkflow($request->user(), (int) $workflow->id);

        return response()->json([
            'message' => 'Workflow deleted successfully.',
        ]);
    }

    public function export(Request $request, Workflow $workflow): JsonResponse
    {
        $template = $this->workflowService->exportWorkflow(
            $request->user(),
            (int) $workflow->id
        );

        return response()->json(['data' => $template]);
    }

    public function import(Request $request): JsonResponse
    {
        $payload = $request->all();

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $contents = file_get_contents($file->getRealPath());
            $decoded = json_decode($contents, true);
            if (! is_array($decoded)) {
                return response()->json([
                    'message' => 'File template bukan format JSON yang valid.',
                ], 422);
            }
            $payload = $decoded;
        }

        $workflow = $this->workflowService->importWorkflow(
            $request->user(),
            $payload
        );

        return response()->json(['data' => $workflow], 201);
    }

    public function duplicate(Request $request, Workflow $workflow): JsonResponse
    {
        $clone = $this->workflowService->duplicateWorkflow(
            $request->user(),
            (int) $workflow->id
        );

        return response()->json(['data' => $clone], 201);
    }
}

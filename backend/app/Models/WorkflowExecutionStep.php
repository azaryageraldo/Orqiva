<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowExecutionStep extends Model
{
    protected $fillable = [
        'workflow_execution_id',
        'workflow_id',
        'workflow_name',
        'step',
        'node_id',
        'node_type',
        'node_name',
        'status',
        'input',
        'output',
        'variables',
        'branch',
        'messages',
        'duration_ms',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'error',
        'executed_at',
    ];

    protected function casts(): array
    {
        return [
            'step' => 'integer',
            'input' => 'array',
            'output' => 'array',
            'variables' => 'array',
            'messages' => 'array',
            'duration_ms' => 'integer',
            'prompt_tokens' => 'integer',
            'completion_tokens' => 'integer',
            'total_tokens' => 'integer',
            'executed_at' => 'datetime',
        ];
    }

    public function execution(): BelongsTo
    {
        return $this->belongsTo(WorkflowExecution::class, 'workflow_execution_id');
    }

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }
}

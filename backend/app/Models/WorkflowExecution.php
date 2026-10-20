<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowExecution extends Model
{
    protected $fillable = [
        'workflow_id',
        'chat_session_id',
        'contact_id',
        'status',
        'input',
        'output',
        'logs',
        'error',
        'started_at',
        'finished_at',
        'current_node_id',
        'current_workflow_id',
        'context',
        'waiting_since',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
    ];

    protected function casts(): array
    {
        return [
            'input' => 'array',
            'output' => 'array',
            'logs' => 'array',
            'context' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'waiting_since' => 'datetime',
            'prompt_tokens' => 'integer',
            'completion_tokens' => 'integer',
            'total_tokens' => 'integer',
        ];
    }

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    public function currentWorkflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class, 'current_workflow_id');
    }

    public function chatSession(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(WorkflowExecutionStep::class)->orderBy('step');
    }
}

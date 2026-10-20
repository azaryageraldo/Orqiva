<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ChatSession extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_HUMAN = 'human';

    public const STATUS_ENDED = 'ended';

    protected $fillable = [
        'user_id',
        'channel_id',
        'contact_id',
        'workflow_id',
        'public_token',
        'status',
        'context',
        'current_workflow_id',
        'current_node_id',
        'takeover_at',
        'ended_at',
        'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'takeover_at' => 'datetime',
            'ended_at' => 'datetime',
            'last_activity_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    public function currentWorkflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class, 'current_workflow_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function execution(): HasOne
    {
        return $this->hasOne(WorkflowExecution::class);
    }
}

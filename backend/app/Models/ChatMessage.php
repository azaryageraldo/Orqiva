<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    public const DELIVERY_PENDING = 'pending';

    public const DELIVERY_SENT = 'sent';

    public const DELIVERY_FAILED = 'failed';

    protected $fillable = [
        'chat_session_id',
        'contact_id',
        'workflow_execution_id',
        'role',
        'content',
        'delivery_status',
        'external_message_id',
        'delivery_error',
        'attachments',
        'client_message_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'attachments' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class, 'chat_session_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function execution(): BelongsTo
    {
        return $this->belongsTo(WorkflowExecution::class, 'workflow_execution_id');
    }
}

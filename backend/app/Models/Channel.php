<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Channel extends Model
{
    public const TYPE_WIDGET = 'widget';

    public const TYPE_TELEGRAM = 'telegram';

    public const TYPES = [
        self::TYPE_WIDGET,
        self::TYPE_TELEGRAM,
    ];

    protected $fillable = [
        'user_id',
        'workflow_id',
        'type',
        'name',
        'public_token',
        'external_id',
        'settings',
        'credentials',
        'is_active',
        'last_connected_at',
        'polling_offset',
        'last_error',
    ];

    protected $hidden = [
        'credentials',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'credentials' => 'encrypted:array',
            'is_active' => 'boolean',
            'last_connected_at' => 'datetime',
            'polling_offset' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ChatSession::class);
    }

    public function contactChannels(): HasMany
    {
        return $this->hasMany(ContactChannel::class);
    }
}

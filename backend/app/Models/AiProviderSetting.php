<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiProviderSetting extends Model
{
    protected $fillable = [
        'user_id',
        'provider',
        'api_key',
        'models',
        'selected_models',
        'default_model',
        'last_checked_at',
    ];

    protected $hidden = [
        'api_key',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'models' => 'array',
            'selected_models' => 'array',
            'last_checked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

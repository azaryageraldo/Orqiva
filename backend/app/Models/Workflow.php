<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;


class Workflow extends Model
{
    protected $fillable = [
        'name',
        'description',
        'status',
        'definition',
    ];

    protected function casts(): array
    {
        return [
            'definition' => 'array',
        ];
    }

    public function executions(): HasMany
    {
        return $this->hasMany(WorkflowExecution::class);
    }


}

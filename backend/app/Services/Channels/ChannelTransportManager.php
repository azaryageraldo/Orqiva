<?php

namespace App\Services\Channels;

use App\Models\Channel;
use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

class ChannelTransportManager
{
    /**
     * @param  array<string, class-string<ChannelTransport>>  $transports
     */
    public function __construct(
        private readonly Container $container,
        private readonly array $transports
    ) {}

    public function for(Channel $channel): ChannelTransport
    {
        $class = $this->transports[$channel->type] ?? null;

        if ($class === null) {
            throw new InvalidArgumentException(
                'Tipe channel belum didukung: '.$channel->type
            );
        }

        return $this->container->make($class);
    }

    public function has(string $type): bool
    {
        return isset($this->transports[$type]);
    }

    /**
     * @return array<int, string>
     */
    public function types(): array
    {
        return array_keys($this->transports);
    }
}

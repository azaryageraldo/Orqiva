<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\ChatMessage;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\GeminiService;
use Database\Seeders\PsStoreWorkflowsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Concerns\ConfiguresAiProvider;
use Tests\TestCase;

class PsStoreClosingFlowTest extends TestCase
{
    use ConfiguresAiProvider;
    use RefreshDatabase;

    private function fakeGeminiSequence(array $payloads): void
    {
        $this->mock(GeminiService::class, function (MockInterface $mock) use ($payloads): void {
            $mock->shouldReceive('generate')->andReturnUsing(
                function () use (&$payloads): array {
                    $payload = array_shift($payloads);

                    if ($payload === null) {
                        throw new \RuntimeException('Unexpected Gemini call.');
                    }

                    return [
                        'text' => json_encode($payload),
                        'finish_reason' => 'STOP',
                        'usage' => [
                            'prompt_tokens' => 10,
                            'completion_tokens' => 5,
                            'total_tokens' => 15,
                        ],
                    ];
                }
            );
        });
    }

    public function test_ps_store_flow_moves_from_offer_to_closing_and_payment(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@gmail.com',
            'password' => 'password',
        ]);

        $this->configureAiProvider($admin);

        $this->seed(PsStoreWorkflowsSeeder::class);

        $channel = Channel::query()->firstOrFail();
        $workflow = Workflow::query()
            ->where('name', 'like', '%Konsultasi%')
            ->firstOrFail();

        $this->fakeGeminiSequence([
            [
                'respond' => [
                    ['replies' => 'Halo, Bapak Budi!'],
                    ['replies' => 'Apakah game ingin versi fisik atau digital?'],
                ],
                'produk_diminati' => 'PS5 Disc',
                'butuh_admin' => false,
            ],
            [
                'respond' => [
                    ['replies' => 'Baik, paket PS5 Disc dengan dua game fisik.'],
                    ['replies' => 'Saya lanjutkan ke proses pesanan.'],
                ],
                'produk_pilihan' => 'PS5 Disc + God of War + Spider-Man 2',
                'estimasi_harga' => 'Perlu konfirmasi admin',
                'mau_beli' => true,
                'butuh_admin' => false,
            ],
            [
                'respond' => [
                    ['replies' => 'Data pesanan sudah lengkap.'],
                    ['replies' => 'Admin akan memverifikasi stok dan total akhir.'],
                ],
                'nama' => 'Budi Santoso',
                'alamat' => 'Jl. Merdeka No. 1 Jakarta Pusat',
                'produk' => 'PS5 Disc + God of War + Spider-Man 2',
                'jumlah' => '1',
                'metode_pembayaran' => 'transfer bank',
                'data_lengkap' => true,
                'butuh_admin' => false,
            ],
            [
                'respond' => [
                    ['replies' => 'Silakan transfer sesuai instruksi admin.'],
                    ['replies' => 'Kirim bukti transfer setelah pembayaran.'],
                ],
                'pembayaran_berhasil' => false,
                'butuh_admin' => false,
            ],
            [
                'respond' => [
                    ['replies' => 'Terima kasih, pembayaran dicatat.'],
                    ['replies' => 'Admin akan memverifikasi dan mengirim pesanan.'],
                ],
                'pembayaran_berhasil' => true,
                'butuh_admin' => false,
            ],
        ]);

        $started = $this->postJson(
            '/api/v1/public/channels/'.$channel->public_token.'/sessions'
        )->assertCreated()->json('data');

        $this->postJson(
            '/api/v1/public/sessions/'.$started['session_token'].'/messages',
            [
                'message' => 'Nama saya Budi Santoso, alamat Jl. Merdeka No. 1 Jakarta Pusat. Saya mau beli paket PS5 Disc dengan dua game fisik, jumlah 1, transfer bank.',
            ]
        )->assertOk();

        $this->postJson(
            '/api/v1/public/sessions/'.$started['session_token'].'/messages',
            ['message' => 'Saya mau ambil paket itu sekarang, tolong proses.']
        )
            ->assertOk()
            ->assertJsonPath('data.session_status', 'active');

        $execution = WorkflowExecution::query()->latest('id')->firstOrFail();

        $this->assertSame('waiting', $execution->status);
        $this->assertSame('ai-payment', $execution->current_node_id);
        $this->assertSame($workflow->id, $execution->workflow_id);

        $messages = collect(
            $this->getJson(
                '/api/v1/public/sessions/'.$started['session_token']
            )->assertOk()->json('data.messages')
        )->pluck('content');

        $this->assertSame(1, $messages->filter(
            fn (string $message): bool => $message === 'Data pesanan sudah lengkap.'
        )->count());
        $this->assertTrue($messages->contains('Silakan transfer sesuai instruksi admin.'));
        $this->assertFalse($messages->contains('Maaf, sedang ada kendala teknis.'));

        $this->postJson(
            '/api/v1/public/sessions/'.$started['session_token'].'/messages',
            ['message' => 'Saya sudah transfer, ini bukti pembayarannya.']
        )
            ->assertOk()
            ->assertJsonPath('data.session_status', 'human');

        $messages = collect(
            $this->getJson(
                '/api/v1/public/sessions/'.$started['session_token']
            )->assertOk()->json('data.messages')
        )->pluck('content');

        $this->assertTrue($messages->contains('Terima kasih, pembayaran dicatat.'));
        $this->assertSame(1, $messages->filter(
            fn (string $message): bool => str_contains($message, 'sudah kami catat')
        )->count());
        $this->assertGreaterThanOrEqual(9, ChatMessage::query()->count());
    }
}

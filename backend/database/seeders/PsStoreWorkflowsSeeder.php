<?php

namespace Database\Seeders;

use App\Models\Channel;
use App\Models\User;
use App\Models\Workflow;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Membuat dua workflow contoh untuk toko PlayStation.
 *
 * Workflow 1 adalah entry channel (memiliki Trigger). Workflow 2 hanya
 * dimasuki lewat Go To lintas workflow. Seeder ini menghapus workflow
 * dan contact milik akun target agar alur serta Inbox lama tidak
 * tercampur dengan data demo yang baru.
 */
class PsStoreWorkflowsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->where('email', 'admin@gmail.com')->first();

        if ($user === null) {
            throw new RuntimeException(
                'Akun admin@gmail.com tidak ditemukan. Jalankan AdminUserSeeder terlebih dahulu.'
            );
        }

        DB::transaction(function () use ($user): void {
            $user->workflows()->delete();
            $user->contacts()->delete();

            $closing = Workflow::create([
                'user_id' => $user->id,
                'name' => 'PS Store - Closing & Pengiriman',
                'description' => 'Workflow lanjutan untuk mengumpulkan data pesanan, konfirmasi pembayaran, dan verifikasi admin. Tidak memiliki Trigger dan hanya dimasuki lewat Go To.',
                'status' => 'active',
                'definition' => $this->closingDefinition(),
            ]);

            $consultation = Workflow::create([
                'user_id' => $user->id,
                'name' => 'PS Store - Konsultasi & Penawaran',
                'description' => 'Workflow entry untuk menyapa pelanggan, menggali kebutuhan, memberi rekomendasi PlayStation, menangani keraguan, lalu mengarahkan ke closing atau admin.',
                'status' => 'active',
                'definition' => $this->consultationDefinition((int) $closing->id),
            ]);

            $channel = Channel::query()->firstOrNew([
                'user_id' => $user->id,
                'type' => 'widget',
            ]);

            $channel->fill([
                'workflow_id' => $consultation->id,
                'name' => 'PS Store Chat',
                'public_token' => $channel->public_token ?: Str::random(48),
                'settings' => [
                    'welcome_message' => 'Halo! Selamat datang di PS Store. Saya siap membantu memilih konsol, game, atau aksesori PlayStation. Apa yang sedang Anda cari?',
                    'placeholder' => 'Tulis kebutuhan atau pertanyaan Anda...',
                ],
                'is_active' => true,
            ]);

            $channel->save();
        });
    }

    private function consultationDefinition(int $closingWorkflowId): array
    {
        $nodes = [
            $this->trigger('trigger-1', 0, 0),
            $this->ai(
                'ai-discovery',
                'Discovery kebutuhan',
                0,
                190,
                <<<'PROMPT'
Anda adalah customer service PS Store yang ramah, profesional, dan efisien. Toko menjual konsol PlayStation, game, dan aksesori, serta dapat membantu trade-in. Tugas Anda pada tahap ini adalah menyapa pelanggan, memahami kebutuhan, dan mengajukan satu sampai tiga pertanyaan lanjutan yang relevan.

Gali informasi berikut bila belum jelas: jenis produk yang dicari (konsol, game, aksesori), tipe PlayStation, kebutuhan utama (main game, hadiah, upgrade, trade-in), dan kisaran budget. Jangan menanyakan semua hal sekaligus. Jangan mengarang stok, harga, bonus, atau ketersediaan. Bila pelanggan meminta admin, membahas grosir, komplain, atau permintaan khusus, set butuh_admin menjadi true.

Tulis balasan bahasa Indonesia yang natural dan ringkas. Jika informasi masih kurang, ajukan satu pertanyaan lanjutan yang jelas. Jangan mengulang pertanyaan yang sudah dijawab.
Bagi jawaban menjadi dua atau tiga bubble pendek di variabel respond; setiap bubble maksimal dua kalimat. Jangan mengulang pertanyaan pelanggan.
PROMPT,
                [
                    ['respond', 'array', 'Balasan customer service; setiap item dikirim sebagai satu bubble.'],
                    ['produk_diminati', 'string', 'Produk atau kategori yang diminati pelanggan; kosongkan bila belum diketahui.'],
                    ['butuh_admin', 'boolean', 'True bila pelanggan perlu langsung ditangani admin.'],
                ]
            ),
            $this->send('send-discovery', 0, 380, '{{discovery-kebutuhan.respond.replies}}'),
            $this->condition('cond-admin-discovery', 0, 570, 'discovery-kebutuhan.butuh_admin', 'Perlu admin sejak awal?'),
            $this->stopper('stopper-discovery', 0, 770),
            $this->ai(
                'ai-offer',
                'Rekomendasi & penawaran',
                0,
                960,
                <<<'PROMPT'
Anda adalah spesialis produk PS Store. Buat rekomendasi yang relevan berdasarkan kebutuhan pelanggan: {{discovery-kebutuhan.produk_diminati}}. Pertimbangkan tipe konsol, tujuan pemakaian, dan budget yang disebut pelanggan. Jika data belum lengkap, berikan dua sampai tiga pilihan umum dan jelaskan perbedaannya secara singkat.

Aturan penting: jangan mengarang stok, diskon, atau angka pasti. Jangan pernah menyatakan stok tersedia, siap, melimpah, atau "sangat memadai". Bila perlu membahas ketersediaan, katakan bahwa admin akan mengecek stok. Untuk estimasi_harga, isi rentang harga hanya bila pelanggan menyebut budget atau bila Anda yakin; jika tidak yakin, isi "Perlu konfirmasi admin". Jangan menjanjikan bonus atau garansi di luar kebijakan toko. Dorong pelanggan menentukan pilihan dengan pertanyaan penutup yang sederhana.

Set mau_beli menjadi true hanya bila pelanggan menyatakan minat membeli atau meminta diproses. Jangan set butuh_admin menjadi true hanya karena perlu konfirmasi stok, harga akhir, atau ongkir; itu bagian dari proses order. Set butuh_admin menjadi true hanya bila pelanggan secara eksplisit meminta admin, ingin grosir, komplain, atau membutuhkan penawaran khusus. Jawab dalam bahasa Indonesia dengan ringkas.
Bagi jawaban menjadi dua atau tiga bubble pendek di variabel respond; setiap bubble maksimal dua kalimat. Jangan mengulang pertanyaan pelanggan.
PROMPT,
                [
                    ['respond', 'array', 'Rekomendasi dan penawaran; setiap item dikirim sebagai satu bubble.'],
                    ['produk_pilihan', 'string', 'Produk yang paling relevan atau dipilih pelanggan.'],
                    ['estimasi_harga', 'string', 'Estimasi harga atau "Perlu konfirmasi admin"; jangan mengarang.'],
                    ['mau_beli', 'boolean', 'True bila pelanggan menyatakan minat membeli atau minta diproses.'],
                    ['butuh_admin', 'boolean', 'True hanya bila pelanggan eksplisit minta admin, grosir, komplain, atau penawaran khusus; bukan karena cek stok rutin.'],
                ]
            ),
            $this->send('send-offer', 0, 1150, '{{rekomendasi-penawaran.respond.replies}}'),
            $this->condition('cond-admin-offer', 0, 1340, 'rekomendasi-penawaran.butuh_admin', 'Perlu admin setelah penawaran?'),
            $this->condition('cond-buy-offer', 0, 1530, 'rekomendasi-penawaran.mau_beli', 'Pelanggan berminat membeli?'),
            $this->ai(
                'ai-objection',
                'Tangani keraguan',
                0, 1730,
                <<<'PROMPT'
Anda adalah customer service PS Store yang sabar dan tidak memaksa. Pelanggan belum yakin setelah rekomendasi sebelumnya ({{rekomendasi-penawaran.produk_pilihan}}, estimasi {{rekomendasi-penawaran.estimasi_harga}}). Tangani keberatan atau keraguan yang disampaikan pelanggan, misalnya soal harga, perbandingan tipe, garansi, atau manfaat upgrade.

Jawab dengan empati, jelaskan trade-off secara jujur, dan tawarkan satu langkah berikutnya yang masuk akal. Jangan mengarang stok, harga, atau promo. Bila pelanggan meminta admin, komplain, atau membutuhkan keputusan khusus, set butuh_admin menjadi true. Set mau_beli menjadi true bila pelanggan akhirnya ingin diproses.

Tulis balasan bahasa Indonesia yang ringkas dan akhiri dengan satu pertanyaan yang membantu keputusan.
Bagi jawaban menjadi dua atau tiga bubble pendek di variabel respond; setiap bubble maksimal dua kalimat. Jangan mengulang pertanyaan pelanggan.
PROMPT,
                [
                    ['respond', 'array', 'Jawaban untuk menangani keraguan; setiap item dikirim sebagai satu bubble.'],
                    ['mau_beli', 'boolean', 'True bila pelanggan akhirnya ingin membeli atau diproses.'],
                    ['butuh_admin', 'boolean', 'True bila pelanggan perlu bantuan admin.'],
                ]
            ),
            $this->send('send-objection', 0, 1920, '{{tangani-keraguan.respond.replies}}'),
            $this->condition('cond-admin-objection', 0, 2110, 'tangani-keraguan.butuh_admin', 'Perlu admin setelah keberatan?'),
            $this->condition('cond-buy-objection', 0, 2300, 'tangani-keraguan.mau_beli', 'Pelanggan yakin membeli?'),
            $this->goTo('goto-closing-offer', 'ai-closing', 350, 1530, $closingWorkflowId, false),
            $this->goTo('goto-closing-objection', 'ai-closing', 350, 2300, $closingWorkflowId, false),
            $this->relocate('relocate-discovery', 'Alihkan ke admin', 350, 570),
            $this->relocate('relocate-offer', 'Alihkan ke admin', 350, 1340),
            $this->relocate('relocate-objection', 'Alihkan ke admin', 350, 2110),
            $this->goTo('goto-wait-objection', 'ai-objection', 0, 2490, null),
        ];

        return [
            'nodes' => $nodes,
            'edges' => [
                $this->edge('e-trigger-discovery', 'trigger-1', 'ai-discovery'),
                $this->edge('e-discovery-send', 'ai-discovery', 'send-discovery'),
                $this->edge('e-send-admin', 'send-discovery', 'cond-admin-discovery'),
                $this->edge('e-admin-true', 'cond-admin-discovery', 'relocate-discovery', 'true'),
                $this->edge('e-admin-false', 'cond-admin-discovery', 'stopper-discovery', 'false'),
                $this->edge('e-wait-discovery', 'stopper-discovery', 'ai-offer'),
                $this->edge('e-offer-send', 'ai-offer', 'send-offer'),
                $this->edge('e-send-admin-offer', 'send-offer', 'cond-admin-offer'),
                $this->edge('e-admin-offer-true', 'cond-admin-offer', 'relocate-offer', 'true'),
                $this->edge('e-admin-offer-false', 'cond-admin-offer', 'cond-buy-offer', 'false'),
                $this->edge('e-buy-true', 'cond-buy-offer', 'goto-closing-offer', 'true'),
                $this->edge('e-buy-false', 'cond-buy-offer', 'ai-objection', 'false'),
                $this->edge('e-objection-send', 'ai-objection', 'send-objection'),
                $this->edge('e-send-admin-objection', 'send-objection', 'cond-admin-objection'),
                $this->edge('e-admin-objection-true', 'cond-admin-objection', 'relocate-objection', 'true'),
                $this->edge('e-admin-objection-false', 'cond-admin-objection', 'cond-buy-objection', 'false'),
                $this->edge('e-buy-again-true', 'cond-buy-objection', 'goto-closing-objection', 'true'),
                $this->edge('e-buy-again-false', 'cond-buy-objection', 'goto-wait-objection', 'false'),
            ],
        ];
    }

    private function closingDefinition(): array
    {
        $nodes = [
            $this->ai(
                'ai-closing',
                'Kumpulkan data pesanan',
                0,
                0,
                <<<'PROMPT'
Anda adalah petugas order PS Store. Lanjutkan percakapan dari workflow konsultasi. Tugas Anda mengumpulkan data pesanan dengan rapi: nama penerima, alamat lengkap, produk yang dipilih, jumlah, dan metode pembayaran. Gunakan riwayat percakapan dan variabel yang sudah ada. Jangan menanyakan ulang data yang sudah jelas.

Pertahankan nilai yang sudah ada pada nama, alamat, produk, jumlah, dan metode_pembayaran. Isi hanya data yang benar-benar disebutkan pelanggan; gunakan string kosong bila belum ada. Set data_lengkap menjadi true hanya jika kelima data tersebut sudah terisi. Set butuh_admin menjadi true bila pelanggan minta admin, komplain, pesanan grosir, atau ada permintaan khusus.

Bila data belum lengkap, tanyakan hanya data yang kurang dalam satu balasan yang ramah. Bila lengkap, cukup beri konfirmasi singkat bahwa data sudah diterima dan pesanan akan diproses; jangan mengulang rincian panjang. Jangan menyebut alamat sebagai tujuan pembayaran. Jangan menyatakan stok tersedia atau siap. Jangan mengarang harga, ongkir, nomor rekening, atau nomor resi.
Bagi jawaban menjadi dua atau tiga bubble pendek di variabel respond; setiap bubble maksimal dua kalimat. Jangan mengulang pertanyaan pelanggan.
PROMPT,
                [
                    ['respond', 'array', 'Balasan untuk melanjutkan pesanan; setiap item dikirim sebagai satu bubble.'],
                    ['nama', 'string', 'Nama penerima; string kosong bila belum ada.'],
                    ['alamat', 'string', 'Alamat pengiriman lengkap; string kosong bila belum ada.'],
                    ['produk', 'string', 'Produk yang dipesan; string kosong bila belum ada.'],
                    ['jumlah', 'string', 'Jumlah unit; string kosong bila belum ada.'],
                    ['metode_pembayaran', 'string', 'Metode pembayaran; string kosong bila belum ada.'],
                    ['data_lengkap', 'boolean', 'True hanya bila nama, alamat, produk, jumlah, dan metode pembayaran sudah terisi.'],
                    ['butuh_admin', 'boolean', 'True bila pelanggan perlu admin, grosir, komplain, atau permintaan khusus.'],
                ]
            ),
            $this->send('send-closing-open', 0, 190, '{{kumpulkan-data-pesanan.respond.replies}}'),
            $this->condition('cond-data-complete', 0, 380, 'kumpulkan-data-pesanan.data_lengkap', 'Data pesanan lengkap?'),
            $this->ai(
                'ai-payment',
                'Konfirmasi pembayaran',
                0, 760,
                <<<'PROMPT'
Anda adalah petugas pembayaran PS Store. Sebutkan produk {{kumpulkan-data-pesanan.produk}} sebanyak {{kumpulkan-data-pesanan.jumlah}} dengan metode {{kumpulkan-data-pesanan.metode_pembayaran}}. Jangan menyebut alamat setelah kata "ke" atau menyiratkan alamat adalah tujuan transfer. Jangan mengarang total akhir, ongkir, nomor rekening, atau tautan pembayaran. Jelaskan bahwa admin akan mengirim instruksi pembayaran dan memverifikasi stok sebelum pesanan diproses.

Jika pelanggan belum membayar, arahkan mereka menunggu instruksi admin dan set pembayaran_berhasil menjadi false. Jika pelanggan menyatakan sudah membayar atau mengirim bukti transfer, set pembayaran_berhasil menjadi true dan minta mereka menunggu verifikasi admin. Set butuh_admin menjadi true hanya bila pelanggan secara eksplisit meminta admin atau melaporkan kendala pembayaran; jangan set true hanya karena admin akan memverifikasi stok atau pembayaran secara rutin.

Tulis balasan bahasa Indonesia yang singkat dan jelas. Jangan pernah mengklaim pembayaran sudah terverifikasi tanpa admin.
Bagi jawaban menjadi dua atau tiga bubble pendek di variabel respond; setiap bubble maksimal dua kalimat. Jangan mengulang pertanyaan pelanggan.
PROMPT,
                [
                    ['respond', 'array', 'Instruksi atau konfirmasi pembayaran; setiap item dikirim sebagai satu bubble.'],
                    ['pembayaran_berhasil', 'boolean', 'True bila pelanggan menyatakan sudah membayar atau mengirim bukti.'],
                    ['butuh_admin', 'boolean', 'True hanya bila pelanggan eksplisit minta admin atau ada kendala pembayaran; bukan untuk verifikasi rutin.'],
                ]
            ),
            $this->send('send-payment', 0, 950, '{{konfirmasi-pembayaran.respond.replies}}'),
            $this->condition('cond-paid', 0, 1140, 'konfirmasi-pembayaran.pembayaran_berhasil', 'Pembayaran sudah dikonfirmasi pelanggan?'),
            $this->send(
                'send-order-received',
                0,
                1340,
                'Terima kasih, {{kumpulkan-data-pesanan.nama}}. Pesanan {{kumpulkan-data-pesanan.produk}} sebanyak {{kumpulkan-data-pesanan.jumlah}} sudah kami catat. Admin akan memverifikasi pembayaran dan stok, lalu mengirim informasi pengiriman. Mohon tunggu sebentar, ya.'
            ),
            $this->relocate('relocate-paid', 'Serahkan ke admin untuk verifikasi', 0, 1530),
            $this->condition('cond-admin-payment', 350, 1340, 'konfirmasi-pembayaran.butuh_admin', 'Perlu admin saat pembayaran?'),
            $this->relocate('relocate-payment-help', 'Alihkan ke admin', 350, 1530),
            $this->goTo('goto-wait-payment', 'ai-payment', 350, 1720, null),
            $this->ai(
                'ai-missing-data',
                'Minta data yang kurang',
                700, 580,
                <<<'PROMPT'
Anda adalah petugas order PS Store. Data pesanan belum lengkap. Periksa nilai berikut: nama="{{kumpulkan-data-pesanan.nama}}", alamat="{{kumpulkan-data-pesanan.alamat}}", produk="{{kumpulkan-data-pesanan.produk}}", jumlah="{{kumpulkan-data-pesanan.jumlah}}", metode pembayaran="{{kumpulkan-data-pesanan.metode_pembayaran}}".

Tanyakan hanya data yang masih kosong, dengan nada ramah dan singkat. Jangan menanyakan ulang data yang sudah terisi. Jangan mengarang harga, ongkir, stok, atau nomor rekening. Jika pelanggan memberikan data baru, perbarui nilai terkait dan set data_lengkap menjadi true hanya bila kelima data sudah lengkap. Bila pelanggan meminta admin atau ada permintaan khusus, set butuh_admin menjadi true. Tulis balasan singkat.
Bagi jawaban menjadi dua atau tiga bubble pendek di variabel respond; setiap bubble maksimal dua kalimat. Jangan mengulang pertanyaan pelanggan.
PROMPT,
                [
                    ['respond', 'array', 'Permintaan data yang kurang; setiap item dikirim sebagai satu bubble.'],
                    ['nama', 'string', 'Nama penerima terbaru.'],
                    ['alamat', 'string', 'Alamat pengiriman terbaru.'],
                    ['produk', 'string', 'Produk yang dipesan terbaru.'],
                    ['jumlah', 'string', 'Jumlah unit terbaru.'],
                    ['metode_pembayaran', 'string', 'Metode pembayaran terbaru.'],
                    ['data_lengkap', 'boolean', 'True bila kelima data pesanan sudah lengkap.'],
                    ['butuh_admin', 'boolean', 'True bila pelanggan perlu admin.'],
                ]
            ),
            $this->send('send-missing-data', 700, 770, '{{minta-data-yang-kurang.respond.replies}}'),
            $this->condition('cond-data-complete-again', 700, 960, 'minta-data-yang-kurang.data_lengkap', 'Data pesanan sudah lengkap?'),
            $this->condition('cond-admin-missing', 700, 1340, 'minta-data-yang-kurang.butuh_admin', 'Perlu admin saat data kurang?'),
            $this->relocate('relocate-missing', 'Alihkan ke admin', 700, 1530),
            $this->goTo('goto-wait-data', 'ai-missing-data', 700, 1720, null),
        ];

        return [
            'nodes' => $nodes,
            'edges' => [
                $this->edge('e-closing-send', 'ai-closing', 'send-closing-open'),
                $this->edge('e-closing-check', 'send-closing-open', 'cond-data-complete'),
                $this->edge('e-data-true', 'cond-data-complete', 'ai-payment', 'true'),
                                $this->edge('e-data-false', 'cond-data-complete', 'goto-wait-data', 'false'),
                $this->edge('e-payment-send', 'ai-payment', 'send-payment'),
                $this->edge('e-payment-check', 'send-payment', 'cond-paid'),
                $this->edge('e-paid-true', 'cond-paid', 'send-order-received', 'true'),
                $this->edge('e-paid-false', 'cond-paid', 'cond-admin-payment', 'false'),
                $this->edge('e-order-admin', 'send-order-received', 'relocate-paid'),
                $this->edge('e-payment-admin-true', 'cond-admin-payment', 'relocate-payment-help', 'true'),
                $this->edge('e-payment-admin-false', 'cond-admin-payment', 'goto-wait-payment', 'false'),
                $this->edge('e-missing-send', 'ai-missing-data', 'send-missing-data'),
                $this->edge('e-missing-check', 'send-missing-data', 'cond-data-complete-again'),
                $this->edge('e-data-again-true', 'cond-data-complete-again', 'ai-payment', 'true'),
                                $this->edge('e-data-again-false', 'cond-data-complete-again', 'cond-admin-missing', 'false'),
                $this->edge('e-missing-admin-true', 'cond-admin-missing', 'relocate-missing', 'true'),
                $this->edge('e-missing-admin-false', 'cond-admin-missing', 'goto-wait-data', 'false'),
            ],
        ];
    }

    private function trigger(string $id, int $x, int $y): array
    {
        return [
            'id' => $id,
            'type' => 'Trigger',
            'position' => ['x' => $x, 'y' => $y],
            'data' => [
                'label' => 'Trigger',
                'nodeName' => 'Pesan masuk',
                'triggerType' => 'chat_message',
            ],
        ];
    }

    private function ai(
        string $id,
        string $name,
        int $x,
        int $y,
        string $prompt,
        array $outputs
    ): array {
        $outputVariables = array_map(function (array $output): array {
            $variable = [
                'name' => $output[0],
                'type' => $output[1],
                'description' => $output[2],
            ];

            if ($output[1] === 'array') {
                $variable['itemField'] = 'replies';
            }

            return $variable;
        }, $outputs);

        return [
            'id' => $id,
            'type' => 'AI Agent',
            'position' => ['x' => $x, 'y' => $y],
            'data' => [
                'label' => 'AI Agent',
                'nodeName' => $name,
                'systemMessage' => $prompt,
                'outputVariables' => $outputVariables,
                'provider' => 'gemini',
                'model' => 'gemini-2.5-flash',
                'temperature' => 0.4,
                'verbosity' => 'concise',
                'contextMessages' => 12,
                'variableDefinitions' => [
                    [
                        'name' => 'customer_name',
                        'type' => 'string',
                        'description' => 'Nama pelanggan yang sedang chat.',
                        'sourceValue' => 'input.customer_name',
                    ],
                ],
            ],
        ];
    }

    private function send(string $id, int $x, int $y, string $template): array
    {
        return [
            'id' => $id,
            'type' => 'Send Message',
            'position' => ['x' => $x, 'y' => $y],
            'data' => [
                'label' => 'Send Message',
                'nodeName' => 'Kirim balasan',
                'messageMode' => 'smart_value',
                'messageTemplate' => $template,
            ],
        ];
    }

    private function condition(string $id, int $x, int $y, string $variable, string $name): array
    {
        return [
            'id' => $id,
            'type' => 'Condition',
            'position' => ['x' => $x, 'y' => $y],
            'data' => [
                'label' => 'Condition',
                'nodeName' => $name,
                'conditionVariable' => $variable,
            ],
        ];
    }

    private function goTo(
        string $id,
        string $targetNodeId,
        int $x,
        int $y,
        ?int $targetWorkflowId,
        bool $endFlow = true
    ): array {
        return [
            'id' => $id,
            'type' => 'Go To',
            'position' => ['x' => $x, 'y' => $y],
            'data' => [
                'label' => 'Go To',
                'nodeName' => $targetWorkflowId === null
                    ? 'Tunggu pesan berikutnya'
                    : 'Lanjut ke closing',
                'targetNodeId' => $targetNodeId,
                'targetWorkflowId' => $targetWorkflowId,
                'endFlow' => $endFlow,
                'setStartingPoint' => false,
            ],
        ];
    }

    private function stopper(string $id, int $x, int $y): array
    {
        return [
            'id' => $id,
            'type' => 'Stopper',
            'position' => ['x' => $x, 'y' => $y],
            'data' => [
                'label' => 'Stopper',
                'nodeName' => 'Tunggu jawaban pelanggan',
            ],
        ];
    }

    private function relocate(string $id, string $name, int $x, int $y): array
    {
        return [
            'id' => $id,
            'type' => 'Relocate',
            'position' => ['x' => $x, 'y' => $y],
            'data' => [
                'label' => 'Relocate',
                'nodeName' => $name,
            ],
        ];
    }

    private function edge(
        string $id,
        string $source,
        string $target,
        ?string $handle = null
    ): array {
        $edge = [
            'id' => $id,
            'source' => $source,
            'target' => $target,
        ];

        if ($handle !== null) {
            $edge['sourceHandle'] = $handle;
        }

        return $edge;
    }
}

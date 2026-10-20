<?php

namespace App\Services\Workflows;

use App\Models\WorkflowExecutionStep;

/**
 * Mengubah error teknis menjadi panduan yang bisa ditindaklanjuti
 * pada halaman audit eksekusi.
 */
class WorkflowDiagnostics
{
    /**
     * @return array{code: string, title: string, reason: string, fix: string, example: ?string}|null
     */
    public function diagnose(?string $error, ?WorkflowExecutionStep $step = null): ?array
    {
        if (! is_string($error) || trim($error) === '') {
            return null;
        }

        $error = trim($error);
        $lower = mb_strtolower($error);

        if (str_contains($lower, 'variabel condition') && str_contains($lower, 'tidak ditemukan')) {
            return $this->result(
                'condition_variable_missing',
                'Variabel Condition tidak ditemukan',
                $error,
                'Samakan nama variabel Condition dengan output AI Agent. Nama variabel tidak boleh memakai spasi.',
                'AI Agent menghasilkan mau_beli, maka Condition memakai mau_beli.'
            );
        }

        if (str_contains($lower, 'nama variabel condition')) {
            return $this->result(
                'condition_variable_invalid',
                'Nama variabel tidak valid',
                $error,
                'Ganti spasi atau karakter khusus dengan garis bawah, lalu pilih ulang variabel di node Condition.',
                'mau beli → mau_beli'
            );
        }

        if (str_contains($lower, 'condition belum memilih')) {
            return $this->result(
                'condition_variable_empty',
                'Condition belum dikonfigurasi',
                $error,
                'Buka node Condition dan pilih variabel bertipe Yes-No dari AI Agent yang terhubung sebelumnya.',
                '{{mau_beli}}'
            );
        }

        if (str_contains($lower, 'tidak dihasilkan ai agent')) {
            return $this->result(
                'condition_variable_not_upstream',
                'Variabel tidak berasal dari AI Agent sebelumnya',
                $error,
                'Tambahkan variabel tersebut sebagai output AI Agent upstream, atau pilih variabel boolean yang tersedia.',
                null
            );
        }

        if (str_contains($lower, 'nama variabel hanya boleh')) {
            return $this->result(
                'variable_name_invalid',
                'Penulisan variabel salah',
                $error,
                'Gunakan huruf, angka, dan garis bawah. Awali dengan huruf atau garis bawah, tanpa spasi.',
                'minat_beli (bukan "minat beli")'
            );
        }

        if (str_contains($lower, 'trigger')) {
            return $this->result(
                'trigger_invalid',
                'Trigger belum benar',
                $error,
                'Workflow entry harus punya tepat satu Trigger dan Trigger harus terhubung ke langkah berikutnya. Workflow lanjutan boleh tanpa Trigger karena dimasuki lewat Go To.',
                null
            );
        }

        if (str_contains($lower, 'condition harus memiliki cabang')) {
            return $this->result(
                'condition_edges_missing',
                'Cabang Condition belum lengkap',
                $error,
                'Hubungkan port hijau (If match) dan port merah (Else) ke node berikutnya.',
                null
            );
        }

        if (str_contains($lower, 'go to')) {
            return $this->result(
                'go_to_invalid',
                'Tujuan Go To bermasalah',
                $error,
                'Pilih workflow dan node tujuan yang masih ada. Jika lintas workflow, pastikan workflow tersebut milik akun yang sama.',
                null
            );
        }

        if (str_contains($lower, 'tidak terhubung')) {
            return $this->result(
                'node_unreachable',
                'Ada node yang tidak terhubung',
                $error,
                'Hubungkan node tersebut ke alur utama atau hapus jika tidak dipakai.',
                null
            );
        }

        if (str_contains($lower, 'batas 100')) {
            return $this->result(
                'loop_limit',
                'Alur berulang tanpa henti',
                $error,
                'Periksa Go To yang kembali ke node sebelumnya. Gunakan End flow agar alur berhenti dan menunggu pesan pelanggan.',
                null
            );
        }

        if (str_contains($lower, 'json')) {
            return $this->result(
                'ai_json_invalid',
                'Format jawaban AI tidak valid',
                $error,
                'Pastikan prompt AI Agent meminta output sesuai schema dan tidak menambahkan teks di luar JSON. Coba lagi atau turunkan temperature.',
                null
            );
        }

        if (str_contains($lower, 'gemini') || str_contains($lower, 'api key')) {
            return $this->result(
                'ai_provider_error',
                'Layanan AI gagal',
                $error,
                'Periksa GEMINI_API_KEY, kuota, dan koneksi backend. Setelah diperbaiki, kirim ulang pesan pelanggan.',
                null
            );
        }

        if (str_contains($lower, 'koneksi berikutnya') || str_contains($lower, 'koneksi keluar')) {
            return $this->result(
                'edge_missing',
                'Koneksi node belum lengkap',
                $error,
                'Tarik koneksi dari node tersebut ke langkah berikutnya. Condition membutuhkan dua cabang.',
                null
            );
        }

        if (str_contains($lower, 'tidak menghasilkan pesan')) {
            return $this->result(
                'message_empty',
                'Pesan tidak dihasilkan',
                $error,
                'Periksa template Send Message. Pastikan variabel yang dipakai dihasilkan AI Agent sebelumnya.',
                '{{respond.replies}}'
            );
        }

        return $this->result(
            'execution_failed',
            'Eksekusi gagal',
            $error,
            'Periksa langkah yang gagal pada timeline, lalu perbaiki node atau variabel yang disebutkan.',
            $step?->node_name
        );
    }

    /**
     * @return array{code: string, title: string, reason: string, fix: string, example: ?string}
     */
    private function result(
        string $code,
        string $title,
        string $reason,
        string $fix,
        ?string $example
    ): array {
        return [
            'code' => $code,
            'title' => $title,
            'reason' => $reason,
            'fix' => $fix,
            'example' => $example,
        ];
    }
}

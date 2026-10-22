/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "id" | "en";
const LANGUAGE_KEY = "orqiva_language";
type TranslationParams = Record<string, string | number>;

type Dictionary = Record<string, string>;

const ID: Dictionary = {
  "common.close": "Tutup",
  "common.cancel": "Batal",
  "common.unknown": "Tidak diketahui",
  "common.active": "Aktif",
  "nav.dashboard": "Dashboard",
  "nav.workflows": "Workflows",
  "nav.inbox": "Inbox",
  "nav.channel": "Channel",
  "nav.activity": "Audit Log",
  "nav.apiKeys": "API Keys",
  "nav.settings": "Pengaturan",
  "nav.help": "Bantuan & Dukungan",
  "nav.workspace": "Workspace",
  "nav.preferences": "Preferensi",

  "common.retry": "Coba lagi",

  "execution.back": "Kembali ke Audit Log",
  "execution.titleSession": "Audit session #{id}",
  "execution.titleExecution": "Audit eksekusi #{id}",
  "execution.loadingWorkflow": "Memuat workflow…",
  "execution.subtitle":
    "{name} · Audit setiap langkah, perpindahan workflow, input, output, dan konsumsi token.",
  "execution.contact": "Contact",
  "execution.contactMissing": "tidak tercatat",
  "execution.session": "Session",
  "execution.activeWorkflow": "Workflow aktif:",
  "execution.refresh": "Segarkan",
  "execution.loadError":
    "Detail eksekusi gagal dimuat. Periksa koneksi backend.",
  "execution.detailUnavailable": "Detail eksekusi tidak tersedia.",
  "execution.duration": "Durasi",
  "execution.totalTokens": "Total token",
  "execution.promptCompletion": "{prompt} prompt · {completion} completion",
  "execution.steps": "Langkah",
  "execution.failedCount": "{count} gagal",
  "execution.time": "Waktu",
  "execution.finished": "Selesai {date}",
  "execution.notFinished": "Belum selesai",
  "execution.nodeLabel": "Node:",
  "execution.fixTitle": "Cara memperbaiki",
  "execution.timeline": "Timeline langkah",
  "execution.stepsShown": "{shown} dari {total} langkah ditampilkan.",
  "execution.nodeFilter": "Node",
  "execution.allNodes": "Semua node",
  "execution.stepStatus": "Status langkah",
  "execution.allStatuses": "Semua status",
  "execution.success": "Sukses",
  "execution.error": "Gagal",
  "execution.reset": "Reset",
  "execution.auditUnavailable": "Audit langkah belum tersedia",
  "execution.auditUnavailableHint":
    "Eksekusi ini dibuat sebelum audit per langkah aktif. Log ringkas di bawah tetap dapat dilihat.",
  "execution.stepFallback": "Langkah",
  "execution.noSummaryLogs": "Tidak ada log ringkas untuk eksekusi ini.",
  "execution.noMatchingSteps": "Tidak ada langkah yang cocok dengan filter.",
  "execution.input": "Input",
  "execution.finalOutput": "Output akhir",
  "execution.escalatedNoReply":
    "Percakapan dialihkan ke admin; AI tidak membalas.",
  "execution.finishedNoMessage": "Workflow selesai tanpa pesan.",
  "execution.noOutput": "Tidak ada output.",
  "execution.sentMessages": "Pesan terkirim",
  "execution.variables": "Variabel",
  "execution.stepInput": "Input langkah",
  "execution.stepOutput": "Output langkah",
  "execution.branchIf": "If match",
  "execution.branchElse": "Else",
  "execution.stepTokens": "{count} token",
  "execution.secondsShort": " dtk",
  "execution.yes": "Ya",
  "execution.no": "Tidak",
  "execution.node.trigger": "Trigger",
  "execution.node.aiAgent": "AI Agent",
  "execution.node.output": "Send Message",
  "execution.node.condition": "Condition",
  "execution.node.relocate": "Relocate",
  "execution.node.goTo": "Go To",
  "execution.node.stopper": "Stopper",

  "editor.currentWorkflowName": "Workflow ini",
  "editor.default.triggerName": "Pesan masuk",
  "editor.default.triggerDescription":
    "Mulai saat pengunjung mengirim pesan",
  "editor.default.agentName": "Respons AI",
  "editor.default.agentDescription": "Buat respons dengan AI",
  "editor.default.agentSystem":
    "Anda adalah asisten yang membantu. Jawab pengunjung dengan jelas dan sopan.",
  "editor.default.customerMessageDescription": "Pesan yang dikirim pengunjung",
  "editor.default.outputDescription":
    "Balasan AI; setiap item dikirim sebagai bubble",
  "editor.default.sendName": "Kirim pesan",
  "editor.default.sendDescription": "Kirim pesan ke pengunjung",
  "editor.default.conditionName": "Periksa kondisi",
  "editor.default.conditionDescription":
    "Bercabang berdasarkan variabel ya/tidak",
  "editor.default.goToName": "Lompat ke langkah",
  "editor.default.goToDescription": "Lompat ke langkah lain",
  "editor.default.relocateName": "Alihkan ke admin",
  "editor.default.relocateDescription":
    "Eskalasi percakapan ke admin manusia",
  "editor.default.stopperName": "Tunggu pesan berikutnya",
  "editor.default.stopperDescription":
    "Tunggu pesan pelanggan berikutnya",

  "editor.validation.multipleTrigger.title": "Trigger lebih dari satu",
  "editor.validation.multipleTrigger.message":
    "Workflow ini memiliki {count} Trigger. Hanya workflow entry yang boleh memiliki satu Trigger.",
  "editor.validation.multipleTrigger.fix":
    "Hapus Trigger tambahan. Workflow lanjutan cukup dimasuki lewat Go To dan tidak perlu Trigger.",
  "editor.validation.triggerUnconnected.title": "Trigger belum tersambung",
  "editor.validation.triggerUnconnected.message":
    "Node \"{name}\" tidak memiliki koneksi keluar.",
  "editor.validation.triggerUnconnected.fix":
    "Hubungkan port Trigger ke node pertama, misalnya AI Agent.",
  "editor.validation.agentConflict.title": "Nama AI Agent bentrok",
  "editor.validation.agentConflict.message":
    "Namespace \"{namespace}\" dipakai oleh \"{first}\" dan \"{second}\".",
  "editor.validation.agentConflict.fix":
    "Beri nama unik pada setiap AI Agent agar smart value tidak tercampur.",
  "editor.validation.emptyPrompt.title": "Prompt AI Agent kosong",
  "editor.validation.emptyPrompt.message":
    "AI Agent \"{name}\" belum memiliki system prompt.",
  "editor.validation.emptyPrompt.fix":
    "Isi prompt dengan peran, tujuan, gaya bahasa, dan aturan kapan harus mengisi variabel.",
  "editor.validation.invalidVariable.title": "Nama variabel tidak valid",
  "editor.validation.invalidVariable.message":
    "Variabel \"{name}\" pada \"{node}\" mengandung spasi atau karakter yang tidak didukung.",
  "editor.validation.invalidVariable.fix":
    "Gunakan huruf, angka, dan underscore tanpa spasi. Contoh: mau_beli. Samakan nama di prompt AI dan Condition.",
  "editor.validation.duplicateVariable.title": "Nama variabel duplikat",
  "editor.validation.duplicateVariable.message":
    "Variabel \"{name}\" muncul lebih dari sekali pada \"{node}\".",
  "editor.validation.duplicateVariable.fix":
    "Ganti salah satu nama agar setiap variabel memiliki nama unik.",
  "editor.validation.invalidItemField.title": "Nama item list tidak valid",
  "editor.validation.invalidItemField.message":
    "Item field \"{field}\" pada variabel \"{name}\" mengandung karakter yang tidak didukung.",
  "editor.validation.invalidItemField.fix":
    "Gunakan nama tanpa spasi, misalnya replies atau daftar_produk.",
  "editor.validation.conditionNoVariable.title":
    "Condition belum memilih variabel",
  "editor.validation.conditionNoVariable.message":
    "Condition \"{name}\" tidak memiliki variabel boolean.",
  "editor.validation.conditionNoVariable.fix":
    "Pilih variabel bertipe Yes-No dari AI Agent yang terhubung sebelum Condition.",
  "editor.validation.conditionInvalidSmart.title":
    "Condition memakai smart value tidak valid",
  "editor.validation.conditionInvalidSmart.message":
    "Condition \"{name}\" memakai \"{field}\". Gunakan format {{nama-agent.variabel}}.",
  "editor.validation.conditionInvalidSmart.fix":
    "Pilih smart value dari daftar AI Agent terdekat, misalnya rekomendasi-penawaran.mau_beli.",
  "editor.validation.conditionUnavailable.title":
    "Condition memakai variabel yang tidak tersedia",
  "editor.validation.conditionUnavailable.message":
    "Variabel \"{field}\" tidak dihasilkan AI Agent sebelum Condition \"{name}\".",
  "editor.validation.conditionUnavailable.fix":
    "Hubungkan AI Agent yang menghasilkan {field}, atau pilih salah satu smart value: {values}.",
  "editor.validation.emptyMessage.title": "Pesan kosong",
  "editor.validation.emptyMessage.message":
    "Send Message \"{name}\" belum memiliki isi pesan.",
  "editor.validation.emptyMessage.fix":
    "Tulis pesan, atau sisipkan variabel seperti {{respond.replies}} dari AI Agent.",
  "editor.validation.goToNoTarget.title": "Go To belum memilih tujuan",
  "editor.validation.goToNoTarget.message":
    "Node Go To \"{name}\" belum memiliki node tujuan.",
  "editor.validation.goToNoTarget.fix":
    "Pilih workflow dan node tujuan, lalu simpan kembali.",
  "editor.validation.goToWorkflowMissing.title":
    "Workflow tujuan tidak ditemukan",
  "editor.validation.goToWorkflowMissing.message":
    "Go To \"{name}\" menunjuk workflow yang tidak tersedia di akun ini.",
  "editor.validation.goToWorkflowMissing.fix":
    "Pilih ulang workflow tujuan. Pastikan workflow tersebut masih ada dan milik akun yang sama.",
  "editor.validation.goToNodeMissing.title":
    "Node tujuan Go To tidak ditemukan",
  "editor.validation.goToNodeMissing.message":
    "Node \"{node}\" tidak ada di workflow \"{workflow}\".",
  "editor.validation.goToNodeMissing.fix":
    "Pilih ulang node tujuan. Jika node diganti nama atau dihapus, perbarui Go To.",
  "editor.validation.goToSelf.title": "Go To menunjuk dirinya sendiri",
  "editor.validation.goToSelf.message":
    "Node Go To \"{name}\" akan berulang tanpa kemajuan.",
  "editor.validation.goToSelf.fix":
    "Pilih node lain setelah Go To, atau pindah ke workflow lain.",

  "editor.backAll": "Semua workflow",
  "editor.title": "Editor workflow",
  "editor.canvasMeta": "Kanvas workflow · {count} langkah",
  "editor.loading": "Memuat",
  "editor.unsaved": "Perubahan belum disimpan",
  "editor.saved": "Tersimpan",
  "editor.saving": "Menyimpan...",
  "editor.save": "Simpan workflow",
  "editor.issues": "{count} masalah perlu diperbaiki sebelum menyimpan",
  "editor.closeIssues": "Tutup daftar masalah",
  "editor.closeLibrary": "Tutup node library",
  "editor.openLibrary": "Buka node library",
  "editor.closeLibraryShort": "Tutup library",
  "editor.nodeLibrary": "Node library",
  "editor.builder": "Builder",
  "editor.chooseStep": "Pilih langkah untuk ditambahkan ke workflow.",
  "editor.loadingWorkflow": "Memuat workflow...",
  "editor.canvasHint":
    "Tarik antar port untuk menghubungkan langkah · Pilih node untuk mengonfigurasi",
  "editor.chatWidget": "Chat Widget",
  "editor.triggerWidgetHint":
    "Trigger memulai workflow saat pesan pelanggan masuk dari chat widget.",
  "editor.nodeSettings": "Pengaturan node",
  "editor.closeNodeSettings": "Tutup pengaturan node",
  "editor.nodeName": "Nama node",
  "editor.giveName": "Beri nama node ini",
  "editor.description": "Deskripsi",
  "editor.triggerTitle": "Pesan chat masuk",
  "editor.triggerDescription":
    "Workflow dimulai saat pelanggan mengirim pesan.",
  "editor.customerMessage": "Pesan pelanggan",
  "editor.triggerTokenHint":
    "Pesan pelanggan otomatis tersedia di AI Agent sebagai {message} dan nama pengunjung sebagai {name}.",
  "editor.triggerNote":
    "Trigger hanya dipakai workflow entry. Workflow lanjutan tidak perlu Trigger dan dimasuki lewat Go To lintas workflow.",
  "editor.aiSettings": "Pengaturan AI Agent",
  "editor.tabNode": "Node",
  "editor.tabPrompt": "Prompt",
  "editor.tabVariables": "Variabel",
  "editor.systemPrompt": "System prompt",
  "editor.systemPromptHint": "Tetapkan peran, gaya bahasa, dan batasan AI.",
  "editor.systemPromptPlaceholder":
    "Anda adalah asisten yang membantu. Jawab dengan jelas, sesuai brand, dan ajukan pertanyaan lanjutan bila perlu...",
  "editor.characters": "{count} karakter",
  "editor.insertDynamic": "Sisipkan nilai dinamis",
  "editor.clickToken": "Klik token untuk menyisipkannya di posisi kursor.",
  "editor.promptTip":
    "Sebutkan tujuan, nada bicara, dan hal yang harus dihindari. Prompt panjang tetap nyaman dibaca karena panel bisa digulir.",
  "editor.outputVariables": "Variabel output",
  "editor.outputVariablesHint":
    "Nilai yang diisi AI otomatis untuk dipakai node berikutnya.",
  "editor.add": "Tambah",
  "editor.removeVariable": "Hapus variabel",
  "editor.typeText": "Teks",
  "editor.typeBoolean": "Ya-Tidak (Condition)",
  "editor.typeArray": "List (bubble)",
  "editor.variableNameError":
    "Tanpa spasi. Gunakan huruf, angka, dan underscore, misalnya mau_beli.",
  "editor.variableDescriptionPlaceholder": "Jawaban AI untuk pelanggan",
  "editor.noVariables": "Belum ada variabel",
  "editor.noVariablesHint":
    "Tambahkan variabel agar AI bisa mengisi nilai untuk node berikutnya.",
  "editor.addVariable": "Tambah variabel",
  "editor.listHint":
    "Gunakan tipe List untuk membalas dengan beberapa bubble chat sekaligus.",
  "editor.nodeNameExample": "mis. Jawab pertanyaan pelanggan",
  "editor.aiModel": "Model AI",
  "editor.aiModelHint":
    "Model mengikuti API key yang tersimpan di menu API Keys.",
  "editor.noApiKey":
    "Belum ada API key tersimpan. Daftar default Gemini masih bisa dipakai, atau atur provider di menu API Keys.",
  "editor.verbosity": "Verbosity",
  "editor.verbosityConcise": "Concise · singkat",
  "editor.verbosityBalanced": "Balanced · seimbang",
  "editor.verbosityDetailed": "Detailed · detail",
  "editor.verbosityHint": "Concise membatasi jawaban agar tidak bertele-tele.",
  "editor.contextMemory": "Memori konteks",
  "editor.contextNone": "Tanpa riwayat",
  "editor.contextMessages": "{count} pesan terakhir",
  "editor.contextHint": "Jumlah pesan sebelumnya yang dikirim ke AI.",
  "editor.temperature": "Temperature: {value}",
  "editor.moreFocused": "Lebih fokus",
  "editor.moreCreative": "Lebih kreatif",
  "editor.messageConfig": "Konfigurasi pesan",
  "editor.messageConfigHint":
    "Susun balasan statis atau gunakan nilai dinamis.",
  "editor.message": "Pesan",
  "editor.messagePlaceholder": "Hai {{customer_name}}, ada yang bisa saya bantu?",
  "editor.previewEmpty": "Pratinjau pesan akan muncul di sini.",
  "editor.listDetected":
    "List terdeteksi: setiap item akan dikirim sebagai bubble chat terpisah.",
  "editor.blueTokens":
    "Token biru adalah nilai dinamis dari node AI Agent yang terhubung.",
  "editor.condition": "Condition",
  "editor.conditionHint":
    "Pilih smart value boolean dari AI Agent terdekat. Jika kondisi terpenuhi, alur masuk ke If match; jika tidak, masuk ke Else.",
  "editor.noBoolean":
    "Belum ada variabel boolean. Tambahkan variabel bertipe Ya-Tidak di AI Agent yang terhubung sebelum node ini.",
  "editor.booleanSmartValue": "Smart value boolean",
  "editor.conditionVariableHint":
    "Smart value memakai nama AI Agent terdekat agar variabel dari node sebelumnya tidak tercampur.",
  "editor.ifMatch": "If match",
  "editor.ifMatchHint": "Cabang jika kondisi terpenuhi.",
  "editor.else": "Else",
  "editor.elseHint": "Cabang jika kondisi tidak terpenuhi.",
  "editor.conditionPorts":
    "Hubungkan port hijau (If match) dan port merah (Else) ke langkah berikutnya.",
  "editor.goTo": "Go To",
  "editor.goToHint":
    "Lompat ke node lain tanpa menggambar koneksi tambahan.",
  "editor.targetWorkflow": "Workflow tujuan",
  "editor.currentWorkflowSuffix": "{name} (workflow ini)",
  "editor.targetNode": "Node tujuan",
  "editor.chooseTargetNode": "Pilih node tujuan…",
  "editor.endFlow": "End flow",
  "editor.endFlowHint":
    "Berhenti dulu di node tujuan. Alur lanjut saat pelanggan mengirim pesan lagi. Jika nonaktif, node tujuan langsung dijalankan pada turn yang sama.",
  "editor.goToWorkflowNote":
    "Go To dapat berpindah ke workflow lain. Workflow tujuan tidak perlu Trigger. Variabel dari workflow sebelumnya tetap tersedia pada context percakapan.",
  "editor.handoff": "Handoff ke admin",
  "editor.handoffHint":
    "Saat alur masuk ke node ini, AI berhenti membalas. Percakapan ditandai sudah ditangani admin manusia, dan pesan pelanggan berikutnya tidak dijawab AI.",
  "editor.relocateNote":
    "Tempatkan Relocate di akhir alur, misalnya setelah Condition mendeteksi pelanggan minta bantuan manusia.",
  "editor.pausePoint": "Titik jeda",
  "editor.pauseHint":
    "Langkah ini menjeda workflow. Saat pelanggan mengirim pesan lagi, eksekusi lanjut dari langkah terhubung berikutnya.",
  "editor.cancel": "Batal",
  "editor.saveChanges": "Simpan perubahan",
  "editor.draft": "Draft workflow",
  "editor.steps": "{count} langkah",
  "editor.connections": "{count} koneksi",
  "editor.dismiss": "Tutup notifikasi",
  "editor.unsavedTitle": "Perubahan workflow belum disimpan",
  "editor.unsavedHint":
    "Anda memiliki perubahan yang belum disimpan. Simpan sebelum meninggalkan halaman?",
  "editor.continueEditing": "Lanjut mengedit",
  "editor.discardLeave": "Buang & keluar",
  "editor.saveLeave": "Simpan & keluar",
  "editor.untitledStep": "Langkah tanpa nama",
  "editor.deleteNode": "Hapus node",
  "editor.deleteNodeNamed": "Hapus {name}",
  "editor.chooseBoolean": "Pilih variabel boolean",
  "editor.chooseVariable": "Pilih variabel",
  "editor.availableValues": "Nilai tersedia",
  "editor.noVariablesSuggestion":
    "Hubungkan AI Agent sebelum langkah ini dan tentukan variabelnya untuk melihat saran.",
  "editor.loadError": "Workflow gagal dimuat. Coba lagi.",
  "editor.saveError": "Workflow gagal disimpan. Coba lagi.",
  "editor.changesApplied":
    "Perubahan diterapkan ke kanvas. Simpan workflow untuk menyimpannya.",
  "editor.saveFirst": "Simpan workflow melalui halaman Workflows terlebih dahulu.",
  "editor.savedNotice": "Workflow tersimpan.",
  "editor.node.triggerDesc": "Mulai dari pesan chat",
  "editor.node.agentDesc": "Buat balasan dan keputusan",
  "editor.node.outputDesc": "Balas dengan satu atau beberapa bubble",
  "editor.node.conditionDesc": "Bercabang berdasarkan variabel ya/tidak",
  "editor.node.goToDesc": "Lompat ke langkah lain",
  "editor.node.relocateDesc": "Alihkan chat ke admin manusia",
  "editor.node.stopperDesc": "Jeda sampai pesan pelanggan berikutnya",
  "editor.token.customerMessage": "Pesan terakhir pelanggan",
  "editor.token.customerName": "Nama pelanggan",

  "activity.title": "Audit Log",
  "activity.subtitle":
    "Satu log per session pelanggan, mencakup seluruh workflow yang dijalankan lewat Go To.",
  "activity.refresh": "Segarkan",
  "activity.loadError": "Audit log gagal dimuat. Periksa koneksi backend.",
  "activity.total": "Total",
  "activity.success": "Sukses",
  "activity.failed": "Gagal",
  "activity.waiting": "Menunggu",
  "activity.running": "Berjalan",
  "activity.escalated": "Ke admin",
  "activity.latestTitle": "Session terbaru",
  "activity.latestDescription":
    "Filter berdasarkan status dan tanggal, lalu buka detail untuk audit per langkah dan workflow.",
  "activity.loadedCount": "{count} session dimuat",
  "activity.statusLabel": "Status",
  "activity.allStatus": "Semua status",
  "activity.fromDate": "Dari tanggal",
  "activity.toDate": "Sampai tanggal",
  "activity.apply": "Terapkan",
  "activity.reset": "Reset",
  "activity.quickRange": "Rentang cepat",
  "activity.presetToday": "Hari ini",
  "activity.preset7": "7 hari",
  "activity.preset30": "30 hari",
  "activity.activeFilter": "Filter aktif",
  "activity.removeStatus": "Hapus filter status",
  "activity.removeDate": "Hapus filter tanggal",
  "activity.dateStart": "Awal",
  "activity.dateEnd": "Sekarang",
  "activity.noMatch": "Tidak ada session yang cocok",
  "activity.empty": "Belum ada session",
  "activity.noMatchHint":
    "Ubah status atau rentang tanggal, lalu terapkan kembali.",
  "activity.emptyHint":
    "Buka Channel lalu mulai percakapan lewat widget untuk melihat audit log di sini.",
  "activity.loadMore": "Muat lebih banyak",
  "activity.workflowFallback": "Workflow #{id}",
  "activity.session": "Session {id}",
  "activity.steps": "{count} langkah",
  "activity.contact": "Contact {name}",
  "activity.contactMissing": "Contact tidak tercatat",
  "activity.tokens": "{count} token",
  "activity.noTokens": "Tanpa token",
  "activity.detail": "Lihat detail",

  "inbox.title": "Inbox",
  "inbox.subtitle":
    "Riwayat lengkap per contact, dengan takeover per session.",
  "inbox.contactCount": "{count} contact",
  "inbox.refresh": "Segarkan",
  "inbox.searchPlaceholder": "Cari nama, ID, atau pesan...",
  "inbox.searchAria": "Cari contact",
  "inbox.listError": "Daftar contact gagal dimuat. Periksa koneksi backend.",
  "inbox.detailError": "Riwayat contact gagal dimuat. Coba lagi.",
  "inbox.actionError": "Status percakapan gagal diubah. Coba lagi.",
  "inbox.takeoverNotice":
    "Percakapan diambil alih. Anda dapat membalas sebagai admin.",
  "inbox.releaseNotice": "Percakapan dikembalikan ke AI.",
  "inbox.replySent": "Balasan admin terkirim.",
  "inbox.replyError": "Balasan admin gagal dikirim. Coba lagi.",
  "inbox.emptyQuery": "Contact tidak ditemukan",
  "inbox.emptyTitle": "Inbox masih kosong",
  "inbox.emptyQueryHint": "Coba kata kunci lain.",
  "inbox.emptyHint":
    "Contact muncul setelah pelanggan mengirim pesan lewat widget Channel.",
  "inbox.noMessages": "Belum ada pesan",
  "inbox.status.active": "AI aktif",
  "inbox.status.human": "Admin",
  "inbox.status.ended": "Selesai",
  "inbox.sessionCount": "{count} session",
  "inbox.messageCount": "{count} pesan",
  "inbox.selectTitle": "Pilih contact",
  "inbox.selectHint":
    "Pilih contact di kiri untuk melihat seluruh riwayat session dan mengambil alih percakapan.",
  "inbox.detailUnavailable": "Detail contact tidak tersedia.",
  "inbox.back": "Kembali ke daftar contact",
  "inbox.takeover": "Ambil alih",
  "inbox.release": "Kembalikan ke AI",
  "inbox.noSessions": "Belum ada session untuk contact ini.",
  "inbox.replyPlaceholder": "Balas sebagai admin...",
  "inbox.sendReply": "Kirim balasan admin",
  "inbox.replyHint":
    "Anda membalas sebagai admin. AI berhenti hingga percakapan dikembalikan.",
  "inbox.aiHandling": "AI menangani session ini. Ambil alih untuk membalas.",
  "inbox.endedHint":
    "Session sudah berakhir. Pelanggan perlu membuka widget baru.",
  "inbox.sessionLabel": "Session #{id}",
  "inbox.latest": "terbaru",
  "inbox.dayUnknown": "Tanggal tidak diketahui",
  "inbox.noSessionMessages": "Belum ada pesan pada session ini.",
  "inbox.admin": "Admin",


  "health.operational": "Operasional",
  "health.offline": "Offline",
  "health.checking": "Memeriksa",
  "footer.tagline": "Connect Intelligence. Automate Everything.",
  "header.workspace": "Workspace",
  "header.workspaceAdmin": "Admin workspace",
  "header.logout": "Keluar",
  "header.loggingOut": "Keluar...",

  "pref.language": "Bahasa",
  "pref.toggleLanguage": "Ganti bahasa",

  "auth.checking": "Memeriksa sesi login...",
  "auth.logoutError": "Logout gagal. Silakan coba lagi.",

  "login.badge": "AUTOMATION WORKSPACE",
  "login.headline1": "Automate the routine.",
  "login.headline2": "Focus on what matters.",
  "login.description":
    "Bangun, hubungkan, dan kelola workflow cerdas dalam satu workspace untuk tim Anda.",
  "login.preview.title": "Customer support",
  "login.preview.subtitle": "Pratinjau workflow",
  "login.preview.configured": "Siap",
  "login.preview.trigger": "Trigger",
  "login.preview.triggerDetail": "Pesan baru",
  "login.preview.ai": "AI Agent",
  "login.preview.aiDetail": "Proses input",
  "login.preview.response": "Respons",
  "login.preview.responseDetail": "Kirim balasan",
  "login.preview.footer": "Langkah terhubung, satu alur yang mulus.",
  "login.brandFooter": "Orqiva · Connect Intelligence. Automate Everything.",
  "login.private": "Workspace privat",
  "login.welcome": "Selamat datang kembali",
  "login.title": "Masuk ke Orqiva",
  "login.subtitle": "Masukkan kredensial untuk mengakses workspace Anda.",
  "login.email": "Alamat email",
  "login.password": "Password",
  "login.showPassword": "Tampilkan password",
  "login.hidePassword": "Sembunyikan password",
  "login.submit": "Masuk",
  "login.submitting": "Sedang masuk...",
  "login.error": "Login gagal. Periksa email, password, dan koneksi backend.",
  "login.secure": "Workspace internal. Akses hanya untuk pengguna yang berwenang.",
  "login.checkingSetup": "Menyiapkan Orqiva...",
  "login.setupWelcome": "Buat akun pertama",
  "login.setupSubtitle":
    "Siapkan akun admin untuk workspace Orqiva di perangkat ini.",
  "login.name": "Nama",
  "login.namePlaceholder": "Nama Anda",
  "login.confirmPassword": "Konfirmasi password",
  "login.passwordHint": "Minimal 8 karakter. Gunakan password yang kuat.",
  "login.passwordMismatch": "Konfirmasi password tidak cocok.",
  "login.setupSubmit": "Buat akun",
  "login.setupSubmitting": "Membuat akun...",
  "login.setupLocal": "Akun disimpan secara lokal di perangkat Anda.",

  "settings.eyebrow": "Preferensi",
  "settings.title": "Pengaturan",
  "settings.subtitle":
    "Profil akun, koneksi provider AI, dan status layanan workspace.",
  "settings.aiTitle": "Koneksi AI",
  "settings.aiDescription":
    "Kelola API key Gemini, OpenAI, dan OpenRouter. Key yang tersimpan langsung dipakai workflow tanpa mengubah `.env`.",
  "settings.manageKeys": "Kelola API Keys",
  "settings.account": "Akun",
  "settings.accountDescription": "Profil pengguna yang sedang aktif.",
  "settings.profileEdit": "Edit profil",
  "settings.profileName": "Nama",
  "settings.profileEmail": "Email",
  "settings.profilePassword": "Password baru",
  "settings.profilePasswordOptional": "(opsional, biarkan kosong untuk tidak mengubah)",
  "settings.currentPassword": "Password saat ini",
  "settings.profileHint": "Kosongkan password baru jika Anda tidak ingin menggantinya.",
  "settings.saveProfile": "Simpan profil",
  "settings.saving": "Menyimpan...",
  "settings.profileSaved": "Profil Anda telah diperbarui.",
  "settings.profileError": "Profil gagal diperbarui. Coba lagi.",
  "settings.profileErrorCurrent": "Password saat ini tidak benar.",

  "settings.name": "Nama",
  "settings.email": "Email",
  "settings.status": "Status layanan",
  "settings.statusDescription": "Koneksi frontend dengan layanan Orqiva.",
  "settings.serviceLabel": "Status layanan",
  "settings.tokenTracking": "Pencatatan token",
  "settings.license": "Lisensi",
  "settings.version": "Versi",
  "settings.madeBy": "Dibuat oleh Azarya Geraldo.",

  "help.eyebrow": "Pusat bantuan",
  "help.title": "Bantuan & Dukungan",
  "help.subtitle":
    "Panduan lengkap untuk menginstal, membangun workflow, menghubungkan channel, dan menjalankan Orqiva.",
  "help.search": "Cari dokumentasi...",
  "help.license": "Lisensi & atribusi",
  "help.licenseDescription":
    "Orqiva dirilis di bawah lisensi MIT. Anda bebas menggunakan, memodifikasi, dan mendistribusikan perangkat lunak ini dengan tetap menyertakan atribusi.",
  "help.developer": "Developer",
  "help.developerDescription":
    "Dokumentasi dibuat dan dirawat oleh Azarya Geraldo. Hubungi lewat kanal berikut untuk pertanyaan, masukan, atau kolaborasi.",
  "help.socialGithub": "GitHub",
  "help.socialTiktok": "TikTok",
  "help.socialLinkedin": "LinkedIn",
  "help.socialInstagram": "Instagram",
  "help.copy": "Salin",
  "help.copied": "Tersalin",
  "help.config": "Konfigurasi",
  "help.output": "Output",
  "help.notes": "Catatan",
  "help.schema": "Contoh schema",
  "help.description": "Keterangan",
  "help.repository": "Repositori",

  "help.section.account.title": "Akun dan login",
  "help.section.account.intro":
    "Orqiva saat ini menggunakan login tunggal tanpa registrasi publik. Akun admin dibuat melalui seeder dan dapat diganti sebelum produksi.",
  "help.section.ai.title": "API key dan provider AI",
  "help.section.ai.intro":
    "Orqiva memakai BYOK (Bring Your Own Key). API key disimpan terenkripsi di database dan tidak pernah dikirim kembali ke browser.",
  "help.section.workflow.title": "Workflow dan node",
  "help.section.workflow.intro":
    "Workflow adalah graph node dan edge. Setiap workflow entry wajib memiliki satu Trigger dan minimal satu Send Message atau Relocate.",
  "help.section.channel.title": "Channel dan widget",
  "help.section.channel.intro":
    "Channel menghubungkan workflow ke pelanggan. Widget website dan bot Telegram sudah tersedia; hubungkan bot lewat token @BotFather. Pesan Telegram diambil dengan long polling sehingga tidak perlu URL publik.",
  "help.section.inbox.title": "Inbox dan human handoff",
  "help.section.inbox.intro":
    "AI menangani percakapan secara otomatis. Admin dapat mengambil alih sesi, membalas manual, lalu mengembalikan percakapan ke AI.",
  "help.section.audit.title": "Audit dan troubleshooting",
  "help.section.audit.intro":
    "Setiap eksekusi mencatat langkah, input, output, token, dan error. Gunakan halaman Audit Log untuk menelusuri kegagalan.",
  "help.section.security.title": "Keamanan dan produksi",
  "help.section.security.intro":
    "Sebelum produksi, ubah kredensial default, gunakan HTTPS, atur CORS, matikan debug, dan backup database secara berkala.",
  "help.section.license.title": "Lisensi dan kontribusi",
  "help.section.license.intro":
    "Proyek ini menggunakan lisensi MIT. Kontribusi, issue, dan perbaikan dokumentasi sangat diterima.",

  "channel.widgetName": "Website Chat Widget",
  "channel.widgetDescription":
    "Pasang widget langsung di website dan hubungkan ke workflow entry.",
  "channel.telegram": "Bot Telegram",
  "channel.whatsapp": "WhatsApp Business",
  "channel.instagram": "Instagram DM",
  "channel.messenger": "Facebook Messenger",
  "channel.telegramDescription":
    "Hubungkan bot Telegram untuk menerima pesan pelanggan.",
  "channel.whatsappDescription":
    "Balas chat WhatsApp Business langsung dari Orqiva.",
  "channel.instagramDescription":
    "Tangani pesan langsung Instagram dalam satu inbox.",
  "channel.messengerDescription":
    "Hubungkan Facebook Messenger untuk percakapan pelanggan.",
  "channel.eyebrow": "Workspace",
  "channel.subtitle":
    "Satu widget dan satu bot Telegram per akun. Keduanya memakai workflow entry sebagai titik awal, lalu alur lanjutan dijalankan lewat Go To.",
  "channel.widgetActive": "Widget aktif",
  "channel.widgetInactive": "Widget nonaktif",
  "channel.errorLoad": "Channel gagal dimuat. Coba muat ulang halaman.",
  "channel.errorSave": "Channel gagal disimpan. Periksa pengaturan.",
  "channel.errorToken": "Token widget gagal diperbarui.",
  "channel.errorCopyUrl": "Tautan gagal disalin. Salin URL secara manual.",
  "channel.errorCopySnippet":
    "Snippet gagal disalin. Salin kode secara manual.",
  "channel.confirmRegenerate":
    "Ganti token widget? Tautan lama langsung berhenti bekerja dan perlu dipasang ulang.",
  "channel.noticeSaved": "Pengaturan widget berhasil diperbarui.",
  "channel.noticeRegenerated": "Token widget berhasil diperbarui.",
  "channel.catalogTitle": "Saluran yang tersedia",
  "channel.catalogDescription":
    "Widget website dan bot Telegram siap dipakai. Kanal lain segera hadir.",
  "channel.catalogCount": "{active} aktif · {soon} segera hadir",
  "channel.cardActive": "Aktif",
  "channel.cardInactive": "Nonaktif",
  "channel.cardComingSoon": "Segera hadir",
  "channel.cardNotConnected": "Belum terhubung",
  "channel.telegramConnect": "Hubungkan",
  "channel.telegramManage": "Kelola bot",
  "channel.telegramDialogTitle": "Bot Telegram",
  "channel.telegramDialogDescription":
    "Tempel token bot dari @BotFather. Pesan masuk diambil lewat long polling, jadi tidak perlu URL publik.",
  "channel.botTokenLabel": "Token bot",
  "channel.botTokenHint":
    "Buat bot lewat @BotFather, lalu salin tokennya. Token disimpan terenkripsi.",
  "channel.botTokenKeepHint":
    "Kosongkan untuk mempertahankan token yang tersimpan.",
  "channel.telegramConnectedAs": "Terhubung sebagai {username}",
  "channel.telegramLastError": "Error terakhir: {error}",
  "channel.telegramActivateHint":
    "Aktifkan agar bot membalas pesan pelanggan. Pilih workflow entry terlebih dahulu.",
  "channel.telegramSave": "Simpan bot",
  "channel.telegramSaved": "Bot Telegram berhasil disimpan.",
  "channel.telegramTokenRequired": "Isi token bot Telegram.",
  "channel.telegramError":
    "Bot Telegram gagal disimpan. Periksa token dan koneksi internet.",
  "channel.editWidgetTitle": "Edit widget",
  "channel.openWidgetTitle": "Buka widget",
  "channel.regenerateTitle": "Ganti token widget",
  "channel.linkTitle": "Tautan widget",
  "channel.linkDescription":
    "Salin URL untuk dipasang atau dibagikan ke pelanggan.",
  "channel.tokenUnavailable": "Token belum tersedia",
  "channel.copiedUrl": "Tersalin",
  "channel.copyUrl": "Salin URL",
  "channel.crossTitle": "Alur lintas workflow",
  "channel.crossDescription":
    "Workflow entry dapat memakai Go To untuk berpindah ke workflow lanjutan. Workflow lanjutan tidak perlu Trigger dan tetap berada dalam audit log session yang sama.",
  "channel.dialogTitle": "Edit website widget",
  "channel.dialogDescription":
    "Atur nama, workflow entry, pesan pembuka, dan placeholder widget.",
  "channel.nameLabel": "Nama channel",
  "channel.namePlaceholder": "Widget Chat Website",
  "channel.workflowLabel": "Workflow entry",
  "channel.selectWorkflow": "Pilih workflow...",
  "channel.noneSelected": "Belum dipilih",
  "channel.noTriggerWarning":
    "Belum ada workflow dengan node Trigger. Tambahkan Trigger pada workflow entry terlebih dahulu.",
  "channel.welcomeLabel": "Pesan pembuka",
  "channel.optional": "(opsional)",
  "channel.welcomePlaceholder": "Halo! Ada yang bisa kami bantu?",
  "channel.welcomeHint":
    "Kosongkan jika tidak ingin menampilkan pesan pembuka.",
  "channel.placeholderLabel": "Placeholder input",
  "channel.placeholderPlaceholder": "Tulis pesan...",
  "channel.placeholderHint":
    "Kosongkan untuk memakai placeholder default.",
  "channel.openModeTitle": "Cara membuka widget",
  "channel.openModeDescription":
    "Tentukan apakah pengunjung harus menekan tombol atau chat langsung terbuka.",
  "channel.openModeManual": "Buka manual",
  "channel.openModeManualHint":
    "Widget tersembunyi sampai pengunjung menekan tombol chat.",
  "channel.openModeAlways": "Selalu terbuka",
  "channel.openModeAlwaysHint":
    "Chat langsung terbuka saat halaman atau tautan dibuka.",
  "channel.appearanceTitle": "Warna widget",
  "channel.appearanceDescription":
    "Default mengikuti Telegram dark. Ubah warna sesuai brand Anda.",
  "channel.resetColors": "Reset Telegram",
  "channel.headerColor": "Warna header",
  "channel.backgroundColor": "Warna latar chat",
  "channel.outgoingColor": "Bubble pelanggan",
  "channel.accentColor": "Warna aksen",
  "channel.previewIncoming": "Halo, ada yang bisa dibantu?",
  "channel.previewOutgoing": "Saya ingin bertanya.",
  "channel.iconsTitle": "Ikon widget",
  "channel.iconsDescription":
    "Gunakan logo Orqiva atau unggah ikon sendiri.",
  "channel.chatIcon": "Ikon chat",
  "channel.chatIconHint": "Tampil sebagai avatar di header chat.",
  "channel.launcherIcon": "Ikon toggle",
  "channel.launcherIconHint":
    "Tampil pada tombol pembuka di situs Anda.",
  "channel.uploadIcon": "Unggah",
  "channel.removeIcon": "Hapus ikon",
  "channel.iconHint":
    "PNG, JPG, atau WebP. Persegi, maksimal 1 MB. Ikon akan dipotong otomatis.",
  "channel.iconSaved": "Ikon widget berhasil diperbarui.",
  "channel.iconRemoved": "Ikon dikembalikan ke logo Orqiva.",
  "channel.iconError": "Ikon gagal diperbarui. Coba lagi.",
  "channel.iconTypeError": "Format ikon harus PNG, JPG, atau WebP.",
  "channel.iconSizeError": "Ukuran ikon maksimal 1 MB.",
  "channel.activateLabel": "Aktifkan widget publik",
  "channel.activateHint":
    "Widget hanya menerima pesan jika aktif dan sudah memiliki workflow entry.",
  "channel.updateWidget": "Update widget",
  "channel.workflowFallback": "Workflow",

  "wf.eyebrow": "Workspace",
  "wf.subtitle":
    "Buat, susun, dan kelola otomatisasi alur kerja dalam satu tempat.",
  "wf.create": "Buat workflow baru",
  "wf.searchPlaceholder": "Cari workflow...",
  "wf.searchAria": "Cari workflow",
  "wf.clearSearch": "Hapus pencarian",
  "wf.showing": "Menampilkan {shown} dari {total} workflow",
  "wf.refresh": "Segarkan",
  "wf.loading": "Memuat...",
  "wf.dismissError": "Batalkan pesan error",
  "wf.loadingTitle": "Memuat workflows",
  "wf.loadingDescription": "Mengambil data dari workspace Anda.",
  "wf.noMatch": "Tidak ada workflow yang cocok",
  "wf.workspaceReady": "Workspace Anda siap digunakan",
  "wf.noMatchDescription": "Coba kata kunci nama atau deskripsi yang berbeda.",
  "wf.workspaceReadyDescription":
    "Buat workflow pertama Anda untuk mulai membangun otomasi.",
  "wf.createShort": "Buat workflow",
  "wf.noDescription": "Belum ada deskripsi.",
  "wf.nodeCount": "{count} node",
  "wf.updated": "Diperbarui {date}",
  "wf.status.draft": "Draft",
  "wf.status.active": "Aktif",
  "wf.editAria": "Edit {name}",
  "wf.deleteAria": "Hapus {name}",
  "wf.editTitle": "Edit workflow",
  "wf.deleteTitle": "Hapus workflow",
  "wf.pageOf": "Halaman {page} dari {last}",
  "wf.previous": "Sebelumnya",
  "wf.next": "Berikutnya",
  "wf.errorLoad": "Workflow gagal dimuat. Periksa koneksi API.",
  "wf.errorCreate": "Workflow gagal dibuat. Periksa koneksi API.",
  "wf.errorDelete": "Workflow gagal dihapus. Coba lagi.",
  "wf.errorSave": "Perubahan workflow gagal disimpan. Coba lagi.",
  "wf.back": "Kembali ke daftar workflow",
  "wf.editEyebrow": "Edit workflow",
  "wf.editHeading": "Perbarui detail workflow",
  "wf.editDescription": "Simpan perubahan sebelum membuka kanvas workflow.",
  "wf.nameLabel": "Nama workflow",
  "wf.descriptionLabel": "Deskripsi",
  "wf.optional": "(opsional)",
  "wf.descriptionPlaceholder": "Jelaskan fungsi workflow ini",
  "wf.statusLabel": "Status",
  "wf.statusHint":
    "Draft belum aktif untuk otomasi. Active menandai workflow siap digunakan.",
  "wf.saving": "Menyimpan...",
  "wf.saveChanges": "Simpan perubahan",
  "wf.openCanvas": "Buka kanvas",
  "wf.newAutomation": "Otomasi baru",
  "wf.createTitle": "Buat workflow",
  "wf.createDescription": "Beri nama workflow dan tambahkan deskripsi singkat.",
  "wf.createPlaceholder": "Contoh: Alur Dukungan Pelanggan",
  "wf.createDescriptionPlaceholder":
    "Apa yang akan diotomatisasi workflow ini?",
  "wf.creating": "Membuat...",
  "wf.deleteQuestion": "Hapus workflow?",
  "wf.deleteDescription":
    "{name} dan konfigurasi node yang disimpan akan dihapus secara permanen.",
  "wf.deleting": "Menghapus...",
  "wf.deleteAction": "Hapus workflow",

  "dashboard.eyebrow": "Ringkasan workspace",
  "dashboard.subtitle":
    "Pantau otomatisasi, konsumsi token AI, dan kesehatan eksekusi dalam satu layar.",
  "dashboard.refresh": "Segarkan",
  "dashboard.viewAudit": "Lihat audit log",
  "dashboard.retry": "Coba lagi",
  "dashboard.tokenUsageError":
    "Statistik token gagal dimuat. Periksa koneksi ke layanan Orqiva.",
  "dashboard.errorLoad":
    "Sebagian data dashboard gagal dimuat. Periksa koneksi API.",
  "dashboard.totalWorkflows": "Total workflow",
  "dashboard.allFlows": "Seluruh alur di workspace",
  "dashboard.active": "Aktif",
  "dashboard.readyPercent": "{percent}% siap dijalankan",
  "dashboard.noWorkflows": "Belum ada workflow",
  "dashboard.draft": "Draft",
  "dashboard.reviewBeforeActive": "Perlu ditinjau sebelum aktif",
  "dashboard.totalTokens": "Total token",
  "dashboard.executions": "Eksekusi",
  "dashboard.runInPeriod": "Dijalankan pada periode",
  "dashboard.avgTokens": "Rata-rata token",
  "dashboard.perExecution": "Per eksekusi",
  "dashboard.successRate": "Tingkat keberhasilan",
  "dashboard.successOfTotal": "{success} sukses dari {total}",
  "dashboard.thisPeriod": "{period} ini",
  "dashboard.period.daily": "Harian",
  "dashboard.period.monthly": "Bulanan",
  "dashboard.period.yearly": "Tahunan",
  "dashboard.tokenUsage": "Penggunaan token",
  "dashboard.tokenUsageDescription":
    "Distribusi token input dan output AI Agent.",
  "dashboard.input": "Input",
  "dashboard.output": "Output",
  "dashboard.chartAria": "Grafik penggunaan token",
  "dashboard.executionResults": "Hasil eksekusi",
  "dashboard.executionResultsDescription":
    "Komposisi status dari seluruh riwayat.",
  "dashboard.recentExecutions": "Eksekusi terbaru",
  "dashboard.recentDescription":
    "Delapan session terakhir dari seluruh workflow.",
  "dashboard.all": "Semua",
  "dashboard.noSessions": "Belum ada session",
  "dashboard.noSessionsDescription":
    "Mulai percakapan lewat widget Channel untuk melihat audit log di sini.",
  "dashboard.executionHash": "Eksekusi #{id}",
  "dashboard.workflowFallback": "Workflow #{id}",
  "dashboard.needsAttention": "Perlu perhatian",
  "dashboard.attentionDescription": "Sinyal yang bisa ditindaklanjuti.",
  "dashboard.failedExecutions": "Eksekusi gagal",
  "dashboard.checkLogs": "Periksa log dan konfigurasi node",
  "dashboard.waitingMessages": "Menunggu pesan",
  "dashboard.waitingMessagesHint":
    "Workflow menunggu pesan pelanggan berikutnya",
  "dashboard.draftWorkflows": "Workflow draft",
  "dashboard.notActivated": "Belum diaktifkan untuk otomasi",
  "dashboard.avgNodes": "Rata-rata node",
  "dashboard.perWorkflow": "Per workflow",
  "dashboard.systemStatus": "Status sistem",
  "dashboard.tokenTracking": "Pencatatan token",
  "dashboard.awaitingData": "Menunggu data",
  "dashboard.timezone": "Zona waktu",
  "dashboard.freeModels": "Model AI gratis",
  "dashboard.freeModelsDescription":
    "Pilihan model $0 dari OpenRouter untuk prototipe dan produksi ringan.",
  "dashboard.docs": "Dokumentasi",
  "dashboard.freeCollection": "Koleksi gratis",
  "dashboard.emptyTokens": "Belum ada token tercatat",
  "dashboard.emptyTokensDescription":
    "Token akan terhitung otomatis setiap kali AI Agent dijalankan.",
  "dashboard.pipelineTitle": "Alur otomasi",
  "dashboard.pipelineTrigger": "Trigger",
  "dashboard.pipelineIncoming": "Pesan masuk",
  "dashboard.pipelineAI": "AI Agent",
  "dashboard.pipelineAIHint": "Model fleksibel",
  "dashboard.pipelineReply": "Balasan",
  "dashboard.pipelineSend": "Send Message",
  "dashboard.tokenTooltip":
    "{label} · {tokens} token · {executions} eksekusi",
  "dashboard.status.success": "Sukses",
  "dashboard.status.failed": "Gagal",
  "dashboard.status.waiting": "Menunggu",
  "dashboard.status.running": "Berjalan",
  "dashboard.status.escalated": "Ke admin",
  "dashboard.successShort": "berhasil",

  "ai.provider.gemini": "Model cepat dan multimodal dari Google untuk percakapan pelanggan.",
  "ai.provider.openai": "Akses model GPT untuk reasoning, penulisan, dan pengambilan keputusan.",
  "ai.provider.openrouter": "Satu API key untuk menjangkau banyak model dari provider berbeda.",
  "ai.eyebrow": "Preferensi",
  "ai.subtitle":
    "Hubungkan model AI milik Anda sendiri. Key yang disimpan langsung dipakai oleh workflow tanpa perlu mengubah file environment.",
  "ai.connectedCount": "{count} provider terhubung",
  "ai.noneConnected": "Belum ada provider",
  "ai.errorLoad": "Koneksi AI gagal dimuat. Coba lagi.",
  "ai.errorDetect": "Model gagal dideteksi.",
  "ai.errorSave": "API key gagal disimpan.",
  "ai.errorDelete": "API key gagal dihapus.",
  "ai.errorPrefs": "Preferensi balasan gagal disimpan.",
  "ai.catalogTitle": "Provider yang tersedia",
  "ai.catalogDescription": "Pilih kartu provider untuk menambahkan atau mengganti API key.",
  "ai.catalogCount": "{active} aktif · {unset} belum diatur",
  "ai.cardConnected": "Terhubung",
  "ai.cardNotConfigured": "Belum diatur",
  "ai.modelNotChosen": "Model belum dipilih",
  "ai.modelsAvailable": "{count} model tersedia",
  "ai.keyNotSaved": "API key belum disimpan",
  "ai.configure": "Atur",
  "ai.configureAria": "Atur API key {name}",
  "ai.prefTitle": "Preferensi balasan AI",
  "ai.prefDescription": "Atur jeda sebelum AI memproses pesan yang baru masuk.",
  "ai.debounceLabel": "Debounce balasan",
  "ai.debounceHint": "0 ms berarti AI langsung membalas. Maksimal 5 detik.",
  "ai.savePrefs": "Simpan preferensi",
  "ai.prefSaved": "Preferensi balasan AI disimpan.",
  "ai.secureTitle": "Aman dan langsung aktif",
  "ai.secure1": "API key disimpan terenkripsi di database.",
  "ai.secure2": "Key tidak pernah dikirim kembali ke browser.",
  "ai.secure3": "Perubahan langsung dipakai saat workflow berjalan.",
  "ai.dialogDescription": "Simpan API key untuk mengaktifkan provider ini di workflow.",
  "ai.providerFallback": "Provider AI",
  "ai.keyConfigured": "API key sudah tersimpan. {count} model terdeteksi.",
  "ai.providerNoKey": "Provider ini belum memiliki API key.",
  "ai.apiKeyLabel": "API key",
  "ai.keyPlaceholderExisting": "Sudah tersimpan. Isi untuk mengganti API key.",
  "ai.keyPlaceholderNew": "Masukkan API key {name}",
  "ai.keyHint": "Key disimpan terenkripsi dan tidak pernah ditampilkan kembali.",
  "ai.defaultModel": "Default model",
  "ai.detecting": "Mendeteksi...",
  "ai.detectModels": "Deteksi model",
  "ai.detectFirst": "Deteksi model terlebih dahulu",
  "ai.modelsAvailableCount": "{count} model tersedia untuk provider ini.",
  "ai.detectHint": "Simpan key untuk mendeteksi model secara otomatis.",
  "ai.getKey": "Cara mendapatkan API key {name}",
  "ai.deleteKey": "Hapus key",
  "ai.deleteConfirm":
    "Hapus API key {name}? Node AI Agent yang memakai provider ini tidak bisa dijalankan sampai key dipasang lagi.",
  "ai.saveKey": "Simpan API key",
  "ai.keySaved": "API key {name} berhasil disimpan.",
  "ai.keyDeleted": "API key {name} dihapus.",
  "ai.keyRequired": "Isi API key terlebih dahulu.",
  "ai.keyRequiredProvider": "API key wajib diisi untuk provider ini.",

  "channel.widgetSnippet": "Snippet embed widget",
  "channel.widgetSnippetDescription":
    "Tempel snippet ini sebelum tag penutup </body> di website Anda.",
  "channel.copySnippet": "Salin snippet",
  "channel.snippetCopied": "Snippet tersalin.",
  "help.onThisPage": "Di halaman ini",
  "help.noResults": "Tidak ada bagian yang cocok dengan pencarian.",
  "public.customerService": "Customer Service",
  "public.welcomeFallback": "Ada yang bisa kami bantu?",
  "public.startChat": "Mulai chat",
  "public.opening": "Membuka chat…",
  "public.closeChat": "Tutup chat",
  "public.online": "online",
  "public.operatorHandling": "sedang membalas…",
  "public.typing": "sedang mengetik…",
  "public.today": "Hari ini",
  "public.yesterday": "Kemarin",
  "public.inputPlaceholder": "Tulis pesan",
  "public.messageLabel": "Pesan",
  "public.send": "Kirim pesan",
  "public.endedNote":
    "Percakapan ini telah berakhir. Muat ulang untuk memulai lagi.",
  "public.unavailableMessage": "Chat belum tersedia saat ini.",
  "public.startError":
    "Chat belum bisa dibuka. Coba muat ulang halaman.",
  "public.sendError": "Pesan gagal dikirim. Coba lagi.",
};

const EN: Dictionary = {
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.unknown": "Unknown",
  "common.active": "Active",
  "nav.dashboard": "Dashboard",
  "nav.workflows": "Workflows",
  "nav.inbox": "Inbox",
  "nav.channel": "Channel",
  "nav.activity": "Audit Log",
  "nav.apiKeys": "API Keys",
  "nav.settings": "Settings",
  "nav.help": "Help & Support",
  "nav.workspace": "Workspace",
  "nav.preferences": "Preferences",

  "common.retry": "Try again",

  "execution.back": "Back to Audit Log",
  "execution.titleSession": "Session audit #{id}",
  "execution.titleExecution": "Execution audit #{id}",
  "execution.loadingWorkflow": "Loading workflow…",
  "execution.subtitle":
    "{name} · Audit every step, workflow transition, input, output, and token usage.",
  "execution.contact": "Contact",
  "execution.contactMissing": "not recorded",
  "execution.session": "Session",
  "execution.activeWorkflow": "Active workflow:",
  "execution.refresh": "Refresh",
  "execution.loadError":
    "Failed to load execution details. Check the backend connection.",
  "execution.detailUnavailable": "Execution details are unavailable.",
  "execution.duration": "Duration",
  "execution.totalTokens": "Total tokens",
  "execution.promptCompletion": "{prompt} prompt · {completion} completion",
  "execution.steps": "Steps",
  "execution.failedCount": "{count} failed",
  "execution.time": "Time",
  "execution.finished": "Finished {date}",
  "execution.notFinished": "Not finished",
  "execution.nodeLabel": "Node:",
  "execution.fixTitle": "How to fix",
  "execution.timeline": "Step timeline",
  "execution.stepsShown": "{shown} of {total} steps shown.",
  "execution.nodeFilter": "Node",
  "execution.allNodes": "All nodes",
  "execution.stepStatus": "Step status",
  "execution.allStatuses": "All statuses",
  "execution.success": "Success",
  "execution.error": "Failed",
  "execution.reset": "Reset",
  "execution.auditUnavailable": "Step audit is not available yet",
  "execution.auditUnavailableHint":
    "This execution was created before per-step auditing was enabled. The summary log below is still available.",
  "execution.stepFallback": "Step",
  "execution.noSummaryLogs": "No summary logs for this execution.",
  "execution.noMatchingSteps": "No steps match the filters.",
  "execution.input": "Input",
  "execution.finalOutput": "Final output",
  "execution.escalatedNoReply":
    "Conversation was handed off to an admin; AI did not reply.",
  "execution.finishedNoMessage": "Workflow finished without a message.",
  "execution.noOutput": "No output.",
  "execution.sentMessages": "Sent messages",
  "execution.variables": "Variables",
  "execution.stepInput": "Step input",
  "execution.stepOutput": "Step output",
  "execution.branchIf": "If match",
  "execution.branchElse": "Else",
  "execution.stepTokens": "{count} tokens",
  "execution.secondsShort": "s",
  "execution.yes": "Yes",
  "execution.no": "No",
  "execution.node.trigger": "Trigger",
  "execution.node.aiAgent": "AI Agent",
  "execution.node.output": "Send Message",
  "execution.node.condition": "Condition",
  "execution.node.relocate": "Relocate",
  "execution.node.goTo": "Go To",
  "execution.node.stopper": "Stopper",

  "editor.currentWorkflowName": "This workflow",
  "editor.default.triggerName": "Incoming message",
  "editor.default.triggerDescription": "Start when a visitor sends a message",
  "editor.default.agentName": "AI response",
  "editor.default.agentDescription": "Generate an AI response",
  "editor.default.agentSystem":
    "You are a helpful assistant. Answer the visitor clearly and politely.",
  "editor.default.customerMessageDescription":
    "Message sent by the visitor",
  "editor.default.outputDescription":
    "AI reply; each item is sent as a bubble",
  "editor.default.sendName": "Send message",
  "editor.default.sendDescription": "Send a message to the visitor",
  "editor.default.conditionName": "Check condition",
  "editor.default.conditionDescription": "Branch on a yes/no variable",
  "editor.default.goToName": "Go to step",
  "editor.default.goToDescription": "Jump to another step",
  "editor.default.relocateName": "Handoff to admin",
  "editor.default.relocateDescription":
    "Escalate the conversation to a human",
  "editor.default.stopperName": "Wait for next message",
  "editor.default.stopperDescription":
    "Wait for the next customer message",

  "editor.validation.multipleTrigger.title": "More than one Trigger",
  "editor.validation.multipleTrigger.message":
    "This workflow has {count} Triggers. Only the workflow entry may have one Trigger.",
  "editor.validation.multipleTrigger.fix":
    "Remove the extra Trigger. Follow-up workflows are entered through Go To and do not need a Trigger.",
  "editor.validation.triggerUnconnected.title": "Trigger is not connected",
  "editor.validation.triggerUnconnected.message":
    "Node \"{name}\" has no outgoing connection.",
  "editor.validation.triggerUnconnected.fix":
    "Connect the Trigger port to the first node, for example AI Agent.",
  "editor.validation.agentConflict.title": "AI Agent name conflict",
  "editor.validation.agentConflict.message":
    "Namespace \"{namespace}\" is used by \"{first}\" and \"{second}\".",
  "editor.validation.agentConflict.fix":
    "Give every AI Agent a unique name so smart values do not mix.",
  "editor.validation.emptyPrompt.title": "AI Agent prompt is empty",
  "editor.validation.emptyPrompt.message":
    "AI Agent \"{name}\" has no system prompt.",
  "editor.validation.emptyPrompt.fix":
    "Fill the prompt with the role, goal, tone, and rules for when variables should be filled.",
  "editor.validation.invalidVariable.title": "Invalid variable name",
  "editor.validation.invalidVariable.message":
    "Variable \"{name}\" on \"{node}\" contains spaces or unsupported characters.",
  "editor.validation.invalidVariable.fix":
    "Use letters, numbers, and underscores without spaces. Example: mau_beli. Keep the name consistent in the AI prompt and Condition.",
  "editor.validation.duplicateVariable.title": "Duplicate variable name",
  "editor.validation.duplicateVariable.message":
    "Variable \"{name}\" appears more than once on \"{node}\".",
  "editor.validation.duplicateVariable.fix":
    "Rename one of them so every variable has a unique name.",
  "editor.validation.invalidItemField.title": "Invalid list item name",
  "editor.validation.invalidItemField.message":
    "Item field \"{field}\" on variable \"{name}\" contains unsupported characters.",
  "editor.validation.invalidItemField.fix":
    "Use a name without spaces, for example replies or product_list.",
  "editor.validation.conditionNoVariable.title":
    "Condition has not selected a variable",
  "editor.validation.conditionNoVariable.message":
    "Condition \"{name}\" has no boolean variable.",
  "editor.validation.conditionNoVariable.fix":
    "Choose a Yes-No variable from a connected AI Agent before the Condition.",
  "editor.validation.conditionInvalidSmart.title":
    "Condition uses an invalid smart value",
  "editor.validation.conditionInvalidSmart.message":
    "Condition \"{name}\" uses \"{field}\". Use the {{agent-name.variable}} format.",
  "editor.validation.conditionInvalidSmart.fix":
    "Choose a smart value from the nearest AI Agent, for example recommendation-offer.want_to_buy.",
  "editor.validation.conditionUnavailable.title":
    "Condition uses an unavailable variable",
  "editor.validation.conditionUnavailable.message":
    "Variable \"{field}\" is not produced by an AI Agent before Condition \"{name}\".",
  "editor.validation.conditionUnavailable.fix":
    "Connect the AI Agent that produces {field}, or choose one of these smart values: {values}.",
  "editor.validation.emptyMessage.title": "Empty message",
  "editor.validation.emptyMessage.message":
    "Send Message \"{name}\" has no message content.",
  "editor.validation.emptyMessage.fix":
    "Write a message, or insert a variable such as {{respond.replies}} from an AI Agent.",
  "editor.validation.goToNoTarget.title": "Go To has no target",
  "editor.validation.goToNoTarget.message":
    "Go To node \"{name}\" has no target node.",
  "editor.validation.goToNoTarget.fix":
    "Choose a target workflow and node, then save again.",
  "editor.validation.goToWorkflowMissing.title":
    "Target workflow not found",
  "editor.validation.goToWorkflowMissing.message":
    "Go To \"{name}\" points to a workflow that is not available on this account.",
  "editor.validation.goToWorkflowMissing.fix":
    "Choose the target workflow again. Make sure it still exists and belongs to the same account.",
  "editor.validation.goToNodeMissing.title":
    "Go To target node not found",
  "editor.validation.goToNodeMissing.message":
    "Node \"{node}\" does not exist in workflow \"{workflow}\".",
  "editor.validation.goToNodeMissing.fix":
    "Choose the target node again. If the node was renamed or deleted, update the Go To.",
  "editor.validation.goToSelf.title": "Go To points to itself",
  "editor.validation.goToSelf.message":
    "Go To node \"{name}\" will loop without progress.",
  "editor.validation.goToSelf.fix":
    "Choose another node after Go To, or move to a different workflow.",

  "editor.backAll": "All workflows",
  "editor.title": "Workflow editor",
  "editor.canvasMeta": "Workflow canvas · {count} steps",
  "editor.loading": "Loading",
  "editor.unsaved": "Unsaved changes",
  "editor.saved": "Saved",
  "editor.saving": "Saving...",
  "editor.save": "Save workflow",
  "editor.issues": "{count} issues need fixing before saving",
  "editor.closeIssues": "Close issue list",
  "editor.closeLibrary": "Close node library",
  "editor.openLibrary": "Open node library",
  "editor.closeLibraryShort": "Close library",
  "editor.nodeLibrary": "Node library",
  "editor.builder": "Builder",
  "editor.chooseStep": "Choose a step to add to your workflow.",
  "editor.loadingWorkflow": "Loading workflow...",
  "editor.canvasHint":
    "Drag between ports to connect steps · Select a node to configure it",
  "editor.chatWidget": "Chat Widget",
  "editor.triggerWidgetHint":
    "The Trigger starts the workflow when a customer message arrives from the chat widget.",
  "editor.nodeSettings": "Node settings",
  "editor.closeNodeSettings": "Close node settings",
  "editor.nodeName": "Node name",
  "editor.giveName": "Give this node a name",
  "editor.description": "Description",
  "editor.triggerTitle": "Incoming chat message",
  "editor.triggerDescription":
    "The workflow starts when a customer sends a message.",
  "editor.customerMessage": "Customer message",
  "editor.triggerTokenHint":
    "The customer message is automatically available in AI Agent as {message} and the visitor name as {name}.",
  "editor.triggerNote":
    "Trigger is only used for the workflow entry. Follow-up workflows do not need a Trigger and are entered through cross-workflow Go To.",
  "editor.aiSettings": "AI Agent settings",
  "editor.tabNode": "Node",
  "editor.tabPrompt": "Prompt",
  "editor.tabVariables": "Variables",
  "editor.systemPrompt": "System prompt",
  "editor.systemPromptHint": "Set the AI role, tone, and guardrails.",
  "editor.systemPromptPlaceholder":
    "You are a helpful assistant. Answer clearly, stay on brand, and ask a follow-up question when needed...",
  "editor.characters": "{count} characters",
  "editor.insertDynamic": "Insert dynamic values",
  "editor.clickToken": "Click a token to insert it at the cursor position.",
  "editor.promptTip":
    "State the goal, tone, and things to avoid. Long prompts stay readable because the panel scrolls.",
  "editor.outputVariables": "Output variables",
  "editor.outputVariablesHint":
    "Values the AI fills automatically for the next nodes.",
  "editor.add": "Add",
  "editor.removeVariable": "Remove variable",
  "editor.typeText": "Text",
  "editor.typeBoolean": "Yes-No (Condition)",
  "editor.typeArray": "List (bubbles)",
  "editor.variableNameError":
    "No spaces. Use letters, numbers, and underscores, for example mau_beli.",
  "editor.variableDescriptionPlaceholder": "AI answer for the customer",
  "editor.noVariables": "No variables yet",
  "editor.noVariablesHint":
    "Add variables so the AI can fill values for the next nodes.",
  "editor.addVariable": "Add variable",
  "editor.listHint":
    "Use the List type to reply with multiple chat bubbles at once.",
  "editor.nodeNameExample": "e.g. Answer customer questions",
  "editor.aiModel": "AI model",
  "editor.aiModelHint":
    "The model follows the API key saved in the API Keys menu.",
  "editor.noApiKey":
    "No API key saved yet. The default Gemini list is still available, or configure a provider in the API Keys menu.",
  "editor.verbosity": "Verbosity",
  "editor.verbosityConcise": "Concise · short",
  "editor.verbosityBalanced": "Balanced",
  "editor.verbosityDetailed": "Detailed",
  "editor.verbosityHint": "Concise keeps answers short and to the point.",
  "editor.contextMemory": "Context memory",
  "editor.contextNone": "No history",
  "editor.contextMessages": "Last {count} messages",
  "editor.contextHint": "Number of previous messages sent to the AI.",
  "editor.temperature": "Temperature: {value}",
  "editor.moreFocused": "More focused",
  "editor.moreCreative": "More creative",
  "editor.messageConfig": "Message configuration",
  "editor.messageConfigHint":
    "Compose a static reply or use dynamic values.",
  "editor.message": "Message",
  "editor.messagePlaceholder": "Hi {{customer_name}}, how can I help?",
  "editor.previewEmpty": "Your message preview will appear here.",
  "editor.listDetected":
    "List detected: each item will be sent as a separate chat bubble.",
  "editor.blueTokens":
    "Blue tokens are dynamic values provided by connected AI Agent nodes.",
  "editor.condition": "Condition",
  "editor.conditionHint":
    "Choose a boolean smart value from the nearest AI Agent. If the condition is met, the flow goes to If match; otherwise it goes to Else.",
  "editor.noBoolean":
    "No boolean variables yet. Add a Yes-No variable in the connected AI Agent before this node.",
  "editor.booleanSmartValue": "Boolean smart value",
  "editor.conditionVariableHint":
    "Smart values use the nearest AI Agent name so variables from earlier nodes do not mix.",
  "editor.ifMatch": "If match",
  "editor.ifMatchHint": "Branch when the condition is met.",
  "editor.else": "Else",
  "editor.elseHint": "Branch when the condition is not met.",
  "editor.conditionPorts":
    "Connect the green port (If match) and red port (Else) to the next steps.",
  "editor.goTo": "Go To",
  "editor.goToHint": "Jump to another node without drawing extra connections.",
  "editor.targetWorkflow": "Target workflow",
  "editor.currentWorkflowSuffix": "{name} (this workflow)",
  "editor.targetNode": "Target node",
  "editor.chooseTargetNode": "Choose a target node…",
  "editor.endFlow": "End flow",
  "editor.endFlowHint":
    "Stop at the target node first. The flow continues when the customer sends another message. When disabled, the target node runs in the same turn.",
  "editor.goToWorkflowNote":
    "Go To can move to another workflow. The target workflow does not need a Trigger. Variables from the previous workflow remain available in the conversation context.",
  "editor.handoff": "Handoff to admin",
  "editor.handoffHint":
    "When the flow reaches this node, AI stops replying. The conversation is marked as handled by a human admin, and the next customer message is not answered by AI.",
  "editor.relocateNote":
    "Place Relocate at the end of the flow, for example after a Condition detects that the customer wants human help.",
  "editor.pausePoint": "Pause point",
  "editor.pauseHint":
    "This step pauses the workflow. When the customer sends another message, execution continues from the next connected step.",
  "editor.cancel": "Cancel",
  "editor.saveChanges": "Save changes",
  "editor.draft": "Draft workflow",
  "editor.steps": "{count} steps",
  "editor.connections": "{count} connections",
  "editor.dismiss": "Dismiss notification",
  "editor.unsavedTitle": "Unsaved workflow changes",
  "editor.unsavedHint":
    "You have changes that are not saved yet. Save them before leaving?",
  "editor.continueEditing": "Continue editing",
  "editor.discardLeave": "Discard & leave",
  "editor.saveLeave": "Save & leave",
  "editor.untitledStep": "Untitled step",
  "editor.deleteNode": "Delete node",
  "editor.deleteNodeNamed": "Delete {name}",
  "editor.chooseBoolean": "Choose a boolean variable",
  "editor.chooseVariable": "Choose a variable",
  "editor.availableValues": "Available values",
  "editor.noVariablesSuggestion":
    "Connect an AI Agent before this step and define its variables to see suggestions.",
  "editor.loadError": "Failed to load workflow. Try again.",
  "editor.saveError": "Failed to save workflow. Try again.",
  "editor.changesApplied":
    "Changes applied to the canvas. Save the workflow to keep them.",
  "editor.saveFirst": "Save the workflow from the Workflows page first.",
  "editor.savedNotice": "Workflow saved.",
  "editor.node.triggerDesc": "Start from a chat message",
  "editor.node.agentDesc": "Generate replies and decisions",
  "editor.node.outputDesc": "Reply with one or more bubbles",
  "editor.node.conditionDesc": "Branch on a yes/no variable",
  "editor.node.goToDesc": "Jump to another step",
  "editor.node.relocateDesc": "Hand the chat to a human admin",
  "editor.node.stopperDesc": "Pause until the next customer message",
  "editor.token.customerMessage": "Last customer message",
  "editor.token.customerName": "Customer name",

  "activity.title": "Audit Log",
  "activity.subtitle":
    "One log per customer session, covering every workflow executed through Go To.",
  "activity.refresh": "Refresh",
  "activity.loadError": "Failed to load the audit log. Check the backend connection.",
  "activity.total": "Total",
  "activity.success": "Success",
  "activity.failed": "Failed",
  "activity.waiting": "Waiting",
  "activity.running": "Running",
  "activity.escalated": "To admin",
  "activity.latestTitle": "Recent sessions",
  "activity.latestDescription":
    "Filter by status and date, then open a session to audit each step and workflow.",
  "activity.loadedCount": "{count} sessions loaded",
  "activity.statusLabel": "Status",
  "activity.allStatus": "All statuses",
  "activity.fromDate": "From date",
  "activity.toDate": "To date",
  "activity.apply": "Apply",
  "activity.reset": "Reset",
  "activity.quickRange": "Quick range",
  "activity.presetToday": "Today",
  "activity.preset7": "7 days",
  "activity.preset30": "30 days",
  "activity.activeFilter": "Active filters",
  "activity.removeStatus": "Remove status filter",
  "activity.removeDate": "Remove date filter",
  "activity.dateStart": "Start",
  "activity.dateEnd": "Now",
  "activity.noMatch": "No matching sessions",
  "activity.empty": "No sessions yet",
  "activity.noMatchHint":
    "Change the status or date range, then apply the filters again.",
  "activity.emptyHint":
    "Open Channel and start a conversation through the widget to see the audit log here.",
  "activity.loadMore": "Load more",
  "activity.workflowFallback": "Workflow #{id}",
  "activity.session": "Session {id}",
  "activity.steps": "{count} steps",
  "activity.contact": "Contact {name}",
  "activity.contactMissing": "Contact not recorded",
  "activity.tokens": "{count} tokens",
  "activity.noTokens": "No tokens",
  "activity.detail": "View detail",

  "inbox.title": "Inbox",
  "inbox.subtitle":
    "Complete history per contact, with per-session takeover.",
  "inbox.contactCount": "{count} contacts",
  "inbox.refresh": "Refresh",
  "inbox.searchPlaceholder": "Search name, ID, or message...",
  "inbox.searchAria": "Search contacts",
  "inbox.listError": "Failed to load contacts. Check the backend connection.",
  "inbox.detailError": "Failed to load contact history. Try again.",
  "inbox.actionError": "Failed to change conversation status. Try again.",
  "inbox.takeoverNotice":
    "Conversation taken over. You can reply as an admin.",
  "inbox.releaseNotice": "Conversation returned to AI.",
  "inbox.replySent": "Admin reply sent.",
  "inbox.replyError": "Failed to send admin reply. Try again.",
  "inbox.emptyQuery": "No contacts found",
  "inbox.emptyTitle": "Inbox is empty",
  "inbox.emptyQueryHint": "Try another keyword.",
  "inbox.emptyHint":
    "Contacts appear after a customer sends a message through the Channel widget.",
  "inbox.noMessages": "No messages yet",
  "inbox.status.active": "AI active",
  "inbox.status.human": "Admin",
  "inbox.status.ended": "Ended",
  "inbox.sessionCount": "{count} sessions",
  "inbox.messageCount": "{count} messages",
  "inbox.selectTitle": "Select a contact",
  "inbox.selectHint":
    "Choose a contact on the left to view full session history and take over the conversation.",
  "inbox.detailUnavailable": "Contact details are unavailable.",
  "inbox.back": "Back to contact list",
  "inbox.takeover": "Take over",
  "inbox.release": "Return to AI",
  "inbox.noSessions": "No sessions for this contact yet.",
  "inbox.replyPlaceholder": "Reply as admin...",
  "inbox.sendReply": "Send admin reply",
  "inbox.replyHint":
    "You are replying as admin. AI stays paused until the conversation is returned.",
  "inbox.aiHandling": "AI is handling this session. Take over to reply.",
  "inbox.endedHint":
    "This session has ended. The customer needs to open a new widget session.",
  "inbox.sessionLabel": "Session #{id}",
  "inbox.latest": "latest",
  "inbox.dayUnknown": "Unknown date",
  "inbox.noSessionMessages": "No messages in this session yet.",
  "inbox.admin": "Admin",


  "health.operational": "Operational",
  "health.offline": "Offline",
  "health.checking": "Checking",
  "footer.tagline": "Connect Intelligence. Automate Everything.",
  "header.workspace": "Workspace",
  "header.workspaceAdmin": "Workspace admin",
  "header.logout": "Log out",
  "header.loggingOut": "Logging out...",

  "pref.language": "Language",
  "pref.toggleLanguage": "Toggle language",

  "auth.checking": "Checking your session...",
  "auth.logoutError": "Logout failed. Please try again.",

  "login.badge": "AUTOMATION WORKSPACE",
  "login.headline1": "Automate the routine.",
  "login.headline2": "Focus on what matters.",
  "login.description":
    "Build, connect, and manage intelligent workflows in one workspace designed for your team.",
  "login.preview.title": "Customer support",
  "login.preview.subtitle": "Workflow preview",
  "login.preview.configured": "Configured",
  "login.preview.trigger": "Trigger",
  "login.preview.triggerDetail": "New message",
  "login.preview.ai": "AI Agent",
  "login.preview.aiDetail": "Process input",
  "login.preview.response": "Response",
  "login.preview.responseDetail": "Send reply",
  "login.preview.footer": "Connected steps, one seamless flow.",
  "login.brandFooter": "Orqiva · Connect Intelligence. Automate Everything.",
  "login.private": "Private workspace",
  "login.welcome": "Welcome back",
  "login.title": "Sign in to Orqiva",
  "login.subtitle": "Enter your credentials to access your workspace.",
  "login.email": "Email address",
  "login.password": "Password",
  "login.showPassword": "Show password",
  "login.hidePassword": "Hide password",
  "login.submit": "Sign in",
  "login.submitting": "Signing in...",
  "login.error": "Login failed. Check your email, password, and backend connection.",
  "login.secure": "Internal workspace. Access is restricted to authorized users.",
  "login.checkingSetup": "Preparing Orqiva...",
  "login.setupWelcome": "Create your first account",
  "login.setupSubtitle":
    "Set up an admin account for this Orqiva workspace.",
  "login.name": "Name",
  "login.namePlaceholder": "Your name",
  "login.confirmPassword": "Confirm password",
  "login.passwordHint": "At least 8 characters. Use a strong password.",
  "login.passwordMismatch": "Passwords do not match.",
  "login.setupSubmit": "Create account",
  "login.setupSubmitting": "Creating account...",
  "login.setupLocal": "Your account is stored locally on this device.",

  "settings.eyebrow": "Preferences",
  "settings.title": "Settings",
  "settings.subtitle":
    "Account profile, AI provider connections, and workspace service status.",
  "settings.aiTitle": "AI connection",
  "settings.aiDescription":
    "Manage Gemini, OpenAI, and OpenRouter API keys. Saved keys are used by workflows immediately without editing `.env`.",
  "settings.manageKeys": "Manage API Keys",
  "settings.account": "Account",
  "settings.accountDescription": "The currently active user profile.",
  "settings.profileEdit": "Edit profile",
  "settings.profileName": "Name",
  "settings.profileEmail": "Email",
  "settings.profilePassword": "New password",
  "settings.profilePasswordOptional": "(optional, leave blank to keep the current password)",
  "settings.currentPassword": "Current password",
  "settings.profileHint": "Leave the new password blank if you do not want to change it.",
  "settings.saveProfile": "Save profile",
  "settings.saving": "Saving...",
  "settings.profileSaved": "Your profile has been updated.",
  "settings.profileError": "Failed to update profile. Try again.",
  "settings.profileErrorCurrent": "Current password is incorrect.",

  "settings.name": "Name",
  "settings.email": "Email",
  "settings.status": "Service status",
  "settings.statusDescription": "Frontend connection to the Orqiva service.",
  "settings.serviceLabel": "Service status",
  "settings.tokenTracking": "Token tracking",
  "settings.license": "License",
  "settings.version": "Version",
  "settings.madeBy": "Built by Azarya Geraldo.",

  "help.eyebrow": "Help center",
  "help.title": "Help & Support",
  "help.subtitle":
    "Complete guides to install Orqiva, build workflows, connect channels, and run it in production.",
  "help.search": "Search documentation...",
  "help.license": "License & attribution",
  "help.licenseDescription":
    "Orqiva is released under the MIT License. You may use, modify, and distribute this software as long as attribution is preserved.",
  "help.developer": "Developer",
  "help.developerDescription":
    "Documentation is built and maintained by Azarya Geraldo. Reach out through the channels below for questions, feedback, or collaboration.",
  "help.socialGithub": "GitHub",
  "help.socialTiktok": "TikTok",
  "help.socialLinkedin": "LinkedIn",
  "help.socialInstagram": "Instagram",
  "help.copy": "Copy",
  "help.copied": "Copied",
  "help.config": "Configuration",
  "help.output": "Output",
  "help.notes": "Notes",
  "help.schema": "Schema example",
  "help.description": "Description",
  "help.repository": "Repository",

  "help.section.account.title": "Account and login",
  "help.section.account.intro":
    "Orqiva currently uses a single login without public registration. The admin account is created by a seeder and can be replaced before production.",
  "help.section.ai.title": "API keys and AI providers",
  "help.section.ai.intro":
    "Orqiva uses BYOK (Bring Your Own Key). API keys are encrypted in the database and are never returned to the browser.",
  "help.section.workflow.title": "Workflows and nodes",
  "help.section.workflow.intro":
    "A workflow is a graph of nodes and edges. Every entry workflow must have one Trigger and at least one Send Message or Relocate.",
  "help.section.channel.title": "Channels and widget",
  "help.section.channel.intro":
    "Channels connect workflows to customers. The website widget and Telegram bot are available; connect the bot with a token from @BotFather. Telegram messages use long polling, so no public URL is required.",
  "help.section.inbox.title": "Inbox and human handoff",
  "help.section.inbox.intro":
    "AI handles conversations automatically. Admins can take over a session, reply manually, then release it back to AI.",
  "help.section.audit.title": "Audit and troubleshooting",
  "help.section.audit.intro":
    "Every execution records steps, input, output, tokens, and errors. Use Audit Log to trace failures.",
  "help.section.security.title": "Security and production",
  "help.section.security.intro":
    "Before production, change default credentials, use HTTPS, configure CORS, disable debug mode, and back up the database regularly.",
  "help.section.license.title": "License and contributions",
  "help.section.license.intro":
    "This project uses the MIT License. Contributions, issues, and documentation improvements are welcome.",

  "channel.widgetName": "Website Chat Widget",
  "channel.widgetDescription":
    "Embed a chat widget on your website and connect it to an entry workflow.",
  "channel.telegram": "Telegram bot",
  "channel.whatsapp": "WhatsApp Business",
  "channel.instagram": "Instagram DM",
  "channel.messenger": "Facebook Messenger",
  "channel.telegramDescription":
    "Connect a Telegram bot to receive customer messages.",
  "channel.whatsappDescription":
    "Reply to WhatsApp Business chats directly from Orqiva.",
  "channel.instagramDescription":
    "Handle Instagram direct messages from one inbox.",
  "channel.messengerDescription":
    "Connect Facebook Messenger for customer conversations.",
  "channel.eyebrow": "Workspace",
  "channel.subtitle":
    "One widget and one Telegram bot per account. Both start from an entry workflow, then continue through Go To steps.",
  "channel.widgetActive": "Widget active",
  "channel.widgetInactive": "Widget inactive",
  "channel.errorLoad": "Channel failed to load. Reload the page.",
  "channel.errorSave": "Channel failed to save. Check the settings.",
  "channel.errorToken": "Widget token failed to update.",
  "channel.errorCopyUrl": "The link could not be copied. Copy the URL manually.",
  "channel.errorCopySnippet":
    "The snippet could not be copied. Copy the code manually.",
  "channel.confirmRegenerate":
    "Regenerate the widget token? Old links stop working immediately and must be reinstalled.",
  "channel.noticeSaved": "Widget settings updated.",
  "channel.noticeRegenerated": "Widget token updated.",
  "channel.catalogTitle": "Available channels",
  "channel.catalogDescription":
    "The website widget and Telegram bot are ready. Other channels are coming soon.",
  "channel.catalogCount": "{active} active · {soon} coming soon",
  "channel.cardActive": "Active",
  "channel.cardInactive": "Inactive",
  "channel.cardComingSoon": "Coming soon",
  "channel.cardNotConnected": "Not connected",
  "channel.telegramConnect": "Connect",
  "channel.telegramManage": "Manage bot",
  "channel.telegramDialogTitle": "Telegram bot",
  "channel.telegramDialogDescription":
    "Paste the bot token from @BotFather. Incoming messages use long polling, so no public URL is needed.",
  "channel.botTokenLabel": "Bot token",
  "channel.botTokenHint":
    "Create a bot with @BotFather, then copy its token. The token is stored encrypted.",
  "channel.botTokenKeepHint": "Leave empty to keep the saved token.",
  "channel.telegramConnectedAs": "Connected as {username}",
  "channel.telegramLastError": "Last error: {error}",
  "channel.telegramActivateHint":
    "Enable this to let the bot reply to customer messages. Choose an entry workflow first.",
  "channel.telegramSave": "Save bot",
  "channel.telegramSaved": "Telegram bot saved.",
  "channel.telegramTokenRequired": "Enter the Telegram bot token.",
  "channel.telegramError":
    "The Telegram bot could not be saved. Check the token and internet connection.",
  "channel.editWidgetTitle": "Edit widget",
  "channel.openWidgetTitle": "Open widget",
  "channel.regenerateTitle": "Regenerate widget token",
  "channel.linkTitle": "Widget link",
  "channel.linkDescription":
    "Copy the URL to install it or share it with customers.",
  "channel.tokenUnavailable": "Token is not available yet",
  "channel.copiedUrl": "Copied",
  "channel.copyUrl": "Copy URL",
  "channel.crossTitle": "Cross-workflow routing",
  "channel.crossDescription":
    "Entry workflows can use Go To to continue into another workflow. Continuation workflows do not need a Trigger and stay in the same session audit log.",
  "channel.dialogTitle": "Edit website widget",
  "channel.dialogDescription":
    "Configure the widget name, entry workflow, welcome message, and input placeholder.",
  "channel.nameLabel": "Channel name",
  "channel.namePlaceholder": "Website Chat Widget",
  "channel.workflowLabel": "Entry workflow",
  "channel.selectWorkflow": "Select a workflow...",
  "channel.noneSelected": "Not selected",
  "channel.noTriggerWarning":
    "No workflow has a Trigger node yet. Add a Trigger to an entry workflow first.",
  "channel.welcomeLabel": "Welcome message",
  "channel.optional": "(optional)",
  "channel.welcomePlaceholder": "Hi! How can we help you today?",
  "channel.welcomeHint":
    "Leave this empty to hide the welcome message.",
  "channel.placeholderLabel": "Input placeholder",
  "channel.placeholderPlaceholder": "Type a message...",
  "channel.placeholderHint":
    "Leave this empty to use the default placeholder.",
  "channel.openModeTitle": "Widget open behavior",
  "channel.openModeDescription":
    "Choose whether visitors must press the button or the chat opens automatically.",
  "channel.openModeManual": "Open manually",
  "channel.openModeManualHint":
    "The widget stays hidden until the visitor presses the chat button.",
  "channel.openModeAlways": "Always open",
  "channel.openModeAlwaysHint":
    "The chat opens automatically when the page or link is opened.",
  "channel.appearanceTitle": "Widget colors",
  "channel.appearanceDescription":
    "Defaults follow Telegram dark. Adjust the colors to match your brand.",
  "channel.resetColors": "Reset to Telegram",
  "channel.headerColor": "Header color",
  "channel.backgroundColor": "Chat background",
  "channel.outgoingColor": "Customer bubble",
  "channel.accentColor": "Accent color",
  "channel.previewIncoming": "Hi, how can we help?",
  "channel.previewOutgoing": "I have a question.",
  "channel.iconsTitle": "Widget icons",
  "channel.iconsDescription":
    "Use the Orqiva logo or upload your own icon.",
  "channel.chatIcon": "Chat icon",
  "channel.chatIconHint": "Shown as the avatar in the chat header.",
  "channel.launcherIcon": "Toggle icon",
  "channel.launcherIconHint":
    "Shown on the launcher button on your website.",
  "channel.uploadIcon": "Upload",
  "channel.removeIcon": "Remove icon",
  "channel.iconHint":
    "PNG, JPG, or WebP. Square, up to 1 MB. Icons are cropped automatically.",
  "channel.iconSaved": "Widget icon updated.",
  "channel.iconRemoved": "Icon restored to the Orqiva logo.",
  "channel.iconError": "The icon could not be updated. Try again.",
  "channel.iconTypeError": "The icon must be a PNG, JPG, or WebP file.",
  "channel.iconSizeError": "The icon must be 1 MB or smaller.",
  "channel.activateLabel": "Enable the public widget",
  "channel.activateHint":
    "The widget only accepts messages when it is active and has an entry workflow.",
  "channel.updateWidget": "Update widget",
  "channel.workflowFallback": "Workflow",

  "wf.eyebrow": "Workspace",
  "wf.subtitle":
    "Create, organize, and manage workflow automation in one place.",
  "wf.create": "Create workflow",
  "wf.searchPlaceholder": "Search workflows...",
  "wf.searchAria": "Search workflows",
  "wf.clearSearch": "Clear search",
  "wf.showing": "Showing {shown} of {total} workflows",
  "wf.refresh": "Refresh",
  "wf.loading": "Loading...",
  "wf.dismissError": "Dismiss error",
  "wf.loadingTitle": "Loading workflows",
  "wf.loadingDescription": "Fetching data from your workspace.",
  "wf.noMatch": "No matching workflows",
  "wf.workspaceReady": "Your workspace is ready",
  "wf.noMatchDescription": "Try a different name or description keyword.",
  "wf.workspaceReadyDescription":
    "Create your first workflow to start building automation.",
  "wf.createShort": "Create workflow",
  "wf.noDescription": "No description yet.",
  "wf.nodeCount": "{count} nodes",
  "wf.updated": "Updated {date}",
  "wf.status.draft": "Draft",
  "wf.status.active": "Active",
  "wf.editAria": "Edit {name}",
  "wf.deleteAria": "Delete {name}",
  "wf.editTitle": "Edit workflow",
  "wf.deleteTitle": "Delete workflow",
  "wf.pageOf": "Page {page} of {last}",
  "wf.previous": "Previous",
  "wf.next": "Next",
  "wf.errorLoad": "Workflows failed to load. Check the API connection.",
  "wf.errorCreate": "Workflow failed to create. Check the API connection.",
  "wf.errorDelete": "Workflow failed to delete. Try again.",
  "wf.errorSave": "Workflow changes failed to save. Try again.",
  "wf.back": "Back to workflow list",
  "wf.editEyebrow": "Edit workflow",
  "wf.editHeading": "Update workflow details",
  "wf.editDescription": "Save changes before opening the workflow canvas.",
  "wf.nameLabel": "Workflow name",
  "wf.descriptionLabel": "Description",
  "wf.optional": "(optional)",
  "wf.descriptionPlaceholder": "Describe what this workflow does",
  "wf.statusLabel": "Status",
  "wf.statusHint":
    "Draft is not active for automation. Active marks the workflow as ready to use.",
  "wf.saving": "Saving...",
  "wf.saveChanges": "Save changes",
  "wf.openCanvas": "Open canvas",
  "wf.newAutomation": "New automation",
  "wf.createTitle": "Create workflow",
  "wf.createDescription": "Name the workflow and add a short description.",
  "wf.createPlaceholder": "Example: Customer Support Flow",
  "wf.createDescriptionPlaceholder":
    "What should this workflow automate?",
  "wf.creating": "Creating...",
  "wf.deleteQuestion": "Delete workflow?",
  "wf.deleteDescription":
    "{name} and its saved node configuration will be permanently deleted.",
  "wf.deleting": "Deleting...",
  "wf.deleteAction": "Delete workflow",

  "dashboard.eyebrow": "Workspace overview",
  "dashboard.subtitle":
    "Track automation, AI token usage, and execution health in one place.",
  "dashboard.refresh": "Refresh",
  "dashboard.viewAudit": "View audit log",
  "dashboard.retry": "Try again",
  "dashboard.tokenUsageError":
    "Token statistics failed to load. Check the connection to the Orqiva service.",
  "dashboard.errorLoad":
    "Some dashboard data failed to load. Check the API connection.",
  "dashboard.totalWorkflows": "Total workflows",
  "dashboard.allFlows": "All flows in the workspace",
  "dashboard.active": "Active",
  "dashboard.readyPercent": "{percent}% ready to run",
  "dashboard.noWorkflows": "No workflows yet",
  "dashboard.draft": "Draft",
  "dashboard.reviewBeforeActive": "Review before activating",
  "dashboard.totalTokens": "Total tokens",
  "dashboard.executions": "Executions",
  "dashboard.runInPeriod": "Executed in this period",
  "dashboard.avgTokens": "Average tokens",
  "dashboard.perExecution": "Per execution",
  "dashboard.successRate": "Success rate",
  "dashboard.successOfTotal": "{success} successful out of {total}",
  "dashboard.thisPeriod": "This {period}",
  "dashboard.period.daily": "Daily",
  "dashboard.period.monthly": "Monthly",
  "dashboard.period.yearly": "Yearly",
  "dashboard.tokenUsage": "Token usage",
  "dashboard.tokenUsageDescription":
    "Input and output token distribution for AI Agent nodes.",
  "dashboard.input": "Input",
  "dashboard.output": "Output",
  "dashboard.chartAria": "Token usage chart",
  "dashboard.executionResults": "Execution results",
  "dashboard.executionResultsDescription":
    "Status composition across all history.",
  "dashboard.recentExecutions": "Recent executions",
  "dashboard.recentDescription":
    "The last eight sessions across all workflows.",
  "dashboard.all": "All",
  "dashboard.noSessions": "No sessions yet",
  "dashboard.noSessionsDescription":
    "Start a conversation through the Channel widget to see audit logs here.",
  "dashboard.executionHash": "Execution #{id}",
  "dashboard.workflowFallback": "Workflow #{id}",
  "dashboard.needsAttention": "Needs attention",
  "dashboard.attentionDescription": "Signals worth reviewing.",
  "dashboard.failedExecutions": "Failed executions",
  "dashboard.checkLogs": "Check logs and node configuration",
  "dashboard.waitingMessages": "Waiting for messages",
  "dashboard.waitingMessagesHint":
    "Workflows waiting for the next customer message",
  "dashboard.draftWorkflows": "Draft workflows",
  "dashboard.notActivated": "Not activated for automation",
  "dashboard.avgNodes": "Average nodes",
  "dashboard.perWorkflow": "Per workflow",
  "dashboard.systemStatus": "System status",
  "dashboard.tokenTracking": "Token tracking",
  "dashboard.awaitingData": "Awaiting data",
  "dashboard.timezone": "Time zone",
  "dashboard.freeModels": "Free AI models",
  "dashboard.freeModelsDescription":
    "$0 model options from OpenRouter for prototypes and light production.",
  "dashboard.docs": "Documentation",
  "dashboard.freeCollection": "Free collection",
  "dashboard.emptyTokens": "No tokens recorded yet",
  "dashboard.emptyTokensDescription":
    "Tokens will be counted automatically whenever an AI Agent runs.",
  "dashboard.pipelineTitle": "Automation flow",
  "dashboard.pipelineTrigger": "Trigger",
  "dashboard.pipelineIncoming": "Incoming message",
  "dashboard.pipelineAI": "AI Agent",
  "dashboard.pipelineAIHint": "Flexible model",
  "dashboard.pipelineReply": "Reply",
  "dashboard.pipelineSend": "Send Message",
  "dashboard.tokenTooltip":
    "{label} · {tokens} tokens · {executions} executions",
  "dashboard.status.success": "Successful",
  "dashboard.status.failed": "Failed",
  "dashboard.status.waiting": "Waiting",
  "dashboard.status.running": "Running",
  "dashboard.status.escalated": "Escalated",
  "dashboard.successShort": "successful",

  "ai.provider.gemini": "Fast, multimodal models from Google for customer conversations.",
  "ai.provider.openai": "GPT models for reasoning, writing, and decision making.",
  "ai.provider.openrouter": "One API key for models from many different providers.",
  "ai.eyebrow": "Preferences",
  "ai.subtitle":
    "Connect your own AI models. Saved keys are used by workflows immediately without editing environment files.",
  "ai.connectedCount": "{count} providers connected",
  "ai.noneConnected": "No providers connected",
  "ai.errorLoad": "AI settings failed to load. Try again.",
  "ai.errorDetect": "Models could not be detected.",
  "ai.errorSave": "API key failed to save.",
  "ai.errorDelete": "API key failed to delete.",
  "ai.errorPrefs": "Reply preferences failed to save.",
  "ai.catalogTitle": "Available providers",
  "ai.catalogDescription": "Select a provider card to add or replace its API key.",
  "ai.catalogCount": "{active} active · {unset} not configured",
  "ai.cardConnected": "Connected",
  "ai.cardNotConfigured": "Not configured",
  "ai.modelNotChosen": "No model selected",
  "ai.modelsAvailable": "{count} models available",
  "ai.keyNotSaved": "API key not saved",
  "ai.configure": "Configure",
  "ai.configureAria": "Configure API key for {name}",
  "ai.prefTitle": "AI reply preferences",
  "ai.prefDescription": "Set the delay before AI processes newly received messages.",
  "ai.debounceLabel": "Reply debounce",
  "ai.debounceHint": "0 ms means AI replies immediately. Maximum 5 seconds.",
  "ai.savePrefs": "Save preferences",
  "ai.prefSaved": "AI reply preferences saved.",
  "ai.secureTitle": "Secure and immediately active",
  "ai.secure1": "API keys are stored encrypted in the database.",
  "ai.secure2": "Keys are never sent back to the browser.",
  "ai.secure3": "Changes take effect the next time a workflow runs.",
  "ai.dialogDescription": "Save an API key to enable this provider in workflows.",
  "ai.providerFallback": "AI provider",
  "ai.keyConfigured": "API key is saved. {count} models detected.",
  "ai.providerNoKey": "This provider does not have an API key yet.",
  "ai.apiKeyLabel": "API key",
  "ai.keyPlaceholderExisting": "Already saved. Enter a value to replace it.",
  "ai.keyPlaceholderNew": "Enter the {name} API key",
  "ai.keyHint": "The key is stored encrypted and never displayed again.",
  "ai.defaultModel": "Default model",
  "ai.detecting": "Detecting...",
  "ai.detectModels": "Detect models",
  "ai.detectFirst": "Detect models first",
  "ai.modelsAvailableCount": "{count} models available for this provider.",
  "ai.detectHint": "Save the key to detect models automatically.",
  "ai.getKey": "How to get an API key for {name}",
  "ai.deleteKey": "Delete key",
  "ai.deleteConfirm":
    "Delete the {name} API key? AI Agent nodes using this provider cannot run until a key is added again.",
  "ai.saveKey": "Save API key",
  "ai.keySaved": "{name} API key saved.",
  "ai.keyDeleted": "{name} API key deleted.",
  "ai.keyRequired": "Enter an API key first.",
  "ai.keyRequiredProvider": "An API key is required for this provider.",

  "channel.widgetSnippet": "Widget embed snippet",
  "channel.widgetSnippetDescription":
    "Paste this snippet before the closing </body> tag on your website.",
  "channel.copySnippet": "Copy snippet",
  "channel.snippetCopied": "Snippet copied.",
  "help.onThisPage": "On this page",
  "help.noResults": "No sections match your search.",
  "public.customerService": "Customer Service",
  "public.welcomeFallback": "How can we help?",
  "public.startChat": "Start chat",
  "public.opening": "Opening chat…",
  "public.closeChat": "Close chat",
  "public.online": "online",
  "public.operatorHandling": "replying…",
  "public.typing": "typing…",
  "public.today": "Today",
  "public.yesterday": "Yesterday",
  "public.inputPlaceholder": "Type a message",
  "public.messageLabel": "Message",
  "public.send": "Send message",
  "public.endedNote":
    "This conversation has ended. Reload to start again.",
  "public.unavailableMessage": "Chat is not available right now.",
  "public.startError": "The chat could not be opened. Try reloading the page.",
  "public.sendError": "The message could not be sent. Try again.",
};

const DICTIONARIES: Record<Language, Dictionary> = { id: ID, en: EN };

interface PreferencesContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStoredLanguage(): Language {
  if (typeof window === "undefined") return "id";
  return window.localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "id";
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const dictionary = DICTIONARIES[language];
      let value = dictionary[key] ?? DICTIONARIES.id[key] ?? key;

      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          value = value.replaceAll(`{${name}}`, String(replacement));
        }
      }

      return value;
    },
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);

  if (context === null) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }

  return context;
}

export function useI18n() {
  const { language, setLanguage, t } = usePreferences();
  return { language, setLanguage, t };
}

export function formatLocale(language: Language): string {
  return language === "en" ? "en-US" : "id-ID";
}

import type { Language } from "./i18n";

export type Localized = Record<Language, string>;

export type HelpBlock = {
  title?: Localized;
  body: Localized;
};

export type HelpSection = {
  id: string;
  title: Localized;
  intro: Localized;
  blocks: HelpBlock[];
  bullets?: Localized[];
};

export type HelpNode = {
  id: string;
  type: string;
  tagline: Localized;
  purpose: Localized;
  config: Localized[];
  output: Localized;
  notes: Localized[];
  schema: string;
};

export type HelpVariable = {
  token: string;
  type: string;
  description: Localized;
};

export type HelpExample = {
  id: string;
  title: Localized;
  description: Localized;
  workflow: string;
};

export const QUICK_START: HelpSection = {
  id: "quickstart",
  title: { id: "Mulai cepat", en: "Quick start" },
  intro: {
    id: "Empat langkah untuk mengubah pesan pelanggan menjadi balasan otomatis.",
    en: "Four steps to turn customer messages into automated replies.",
  },
  blocks: [
    {
      title: { id: "1. Hubungkan provider AI", en: "1. Connect an AI provider" },
      body: {
        id: "Buka API Keys, pilih Gemini, OpenAI, atau OpenRouter, lalu simpan API key Anda. Key disimpan terenkripsi dan hanya dipakai di server.",
        en: "Open API Keys, choose Gemini, OpenAI, or OpenRouter, then save your key. Keys are encrypted at rest and only used on the server.",
      },
    },
    {
      title: { id: "2. Bangun workflow", en: "2. Build a workflow" },
      body: {
        id: "Buat workflow di editor. Setiap workflow yang dijalankan membutuhkan satu Trigger dan minimal satu Send Message atau Relocate.",
        en: "Create a workflow in the editor. Every runnable workflow needs one Trigger and at least one Send Message or Relocate node.",
      },
    },
    {
      title: { id: "3. Aktifkan channel", en: "3. Activate a channel" },
      body: {
        id: "Buka Channel, pilih workflow entry, lalu pasang widget atau hubungkan bot Telegram. Channel yang sama menampung semua percakapan di Inbox.",
        en: "Open Channel, pick an entry workflow, then embed the widget or connect a Telegram bot. Every channel lands in the same Inbox.",
      },
    },
    {
      title: { id: "4. Uji dan pantau", en: "4. Test and monitor" },
      body: {
        id: "Kirim pesan percobaan dari widget atau Telegram, lalu periksa Inbox dan Audit Log untuk melihat langkah, token, dan error.",
        en: "Send a test message from the widget or Telegram, then review Inbox and Audit Log to inspect steps, tokens, and errors.",
      },
    },
  ],
};

export const CONCEPTS: HelpSection = {
  id: "concepts",
  title: { id: "Konsep dasar", en: "Core concepts" },
  intro: {
    id: "Model mental singkat sebelum membangun alur yang lebih panjang.",
    en: "A short mental model before building longer flows.",
  },
  blocks: [],
  bullets: [
    {
      id: "Workflow adalah kumpulan node dan edge. Node melakukan aksi; edge menentukan langkah berikutnya.",
      en: "A workflow is a set of nodes and edges. Nodes perform actions; edges decide what runs next.",
    },
    {
      id: "Workflow entry adalah workflow yang dipakai channel sebagai titik awal. Workflow lain dapat dipanggil lewat node Go To.",
      en: "An entry workflow is the starting point used by a channel. Other workflows can be called through a Go To node.",
    },
    {
      id: "Satu sesi mewakili percakapan dengan satu kontak. Riwayat, status human handoff, dan posisi resume disimpan per sesi.",
      en: "A session represents one conversation with a contact. History, handoff status, and resume position are stored per session.",
    },
    {
      id: "Relocate mengalihkan percakapan ke admin dan menghentikan balasan AI. Admin dapat membalas manual lalu mengembalikan sesi ke AI.",
      en: "Relocate hands the conversation to an admin and stops AI replies. Admins can reply manually and then release the session back to AI.",
    },
    {
      id: "Eksekusi berjalan di queue. Balasan diproses di background, sehingga worker harus tetap berjalan.",
      en: "Executions run on the queue. Replies are processed in the background, so the worker must stay running.",
    },
  ],
};

export const NODES: HelpNode[] = [
  {
    id: "trigger",
    type: "Trigger",
    tagline: { id: "Titik masuk percakapan", en: "Conversation entry point" },
    purpose: {
      id: "Memulai eksekusi saat pelanggan mengirim pesan. Menyediakan pesan dan nama pelanggan untuk node berikutnya.",
      en: "Starts an execution when a customer sends a message. It exposes the message and customer name to downstream nodes.",
    },
    config: [
      {
        id: "Nama node dan deskripsi untuk membedakan beberapa alur.",
        en: "Node name and description to tell flows apart.",
      },
    ],
    output: {
      id: "{{customer_message}} dan {{customer_name}}.",
      en: "{{customer_message}} and {{customer_name}}.",
    },
    notes: [
      {
        id: "Workflow yang dijalankan membutuhkan tepat satu Trigger dan Trigger tidak boleh memiliki koneksi masuk.",
        en: "A runnable workflow needs exactly one Trigger, and a Trigger cannot have incoming edges.",
      },
      {
        id: "Pesan kosong tidak diproses. Channel nonaktif juga tidak menerima pesan.",
        en: "Empty messages are ignored. Inactive channels do not accept messages either.",
      },
    ],
    schema: `{
  "id": "trigger-1",
  "type": "Trigger",
  "data": {
    "label": "Trigger",
    "nodeName": "Pesan masuk"
  }
}`,
  },
  {
    id: "ai-agent",
    type: "AI Agent",
    tagline: { id: "Balasan dan variabel dari model", en: "Model replies and variables" },
    purpose: {
      id: "Memanggil provider AI dengan system prompt, konteks percakapan, dan daftar variabel output yang Anda tentukan.",
      en: "Calls an AI provider with a system prompt, conversation context, and the output variables you define.",
    },
    config: [
      {
        id: "Provider dan model: Gemini, OpenAI, atau OpenRouter sesuai API key yang tersimpan.",
        en: "Provider and model: Gemini, OpenAI, or OpenRouter based on the saved API key.",
      },
      {
        id: "System prompt: instruksi utama; dapat memakai variabel upstream seperti {{customer_message}}.",
        en: "System prompt: core instructions; may use upstream variables such as {{customer_message}}.",
      },
      {
        id: "Temperature, verbosity (concise/balanced/detailed), dan contextMessages (0-20) mengatur gaya serta jumlah riwayat.",
        en: "Temperature, verbosity (concise/balanced/detailed), and contextMessages (0-20) control style and history length.",
      },
      {
        id: "Output variables: nama, tipe (string/boolean/array), itemField untuk array, dan deskripsi yang dibaca model.",
        en: "Output variables: name, type (string/boolean/array), itemField for arrays, and a description read by the model.",
      },
    ],
    output: {
      id: "Variabel dinamai dari node, misalnya {{respons-ai.respond.replies}} atau {{respons-ai.mau_beli}}.",
      en: "Variables are namespaced by node, for example {{ai-response.respond.replies}} or {{ai-response.mau_beli}}.",
    },
    notes: [
      {
        id: "Nama node harus unik karena menjadi namespace variabel. Dua AI Agent dengan nama sama akan ditolak validator.",
        en: "Node names must be unique because they become variable namespaces. Two AI Agents with the same name are rejected by validation.",
      },
      {
        id: "Array output yang dipakai di Send Message dikirim sebagai beberapa bubble, satu item per bubble.",
        en: "An array output referenced in Send Message is delivered as multiple bubbles, one item per bubble.",
      },
      {
        id: "Model gambar, embedding, dan TTS tidak dapat dipakai untuk node ini.",
        en: "Image, embedding, and TTS models cannot be used with this node.",
      },
    ],
    schema: `{
  "id": "ai-1",
  "type": "AI Agent",
  "data": {
    "label": "AI Agent",
    "nodeName": "Respons AI",
    "provider": "gemini",
    "model": "gemini-3.8-flash",
    "systemMessage": "Anda asisten toko yang ramah.",
    "temperature": 0.7,
    "verbosity": "concise",
    "contextMessages": 10,
    "outputVariables": [
      {
        "name": "respond",
        "type": "array",
        "itemField": "replies",
        "description": "Balasan singkat; tiap item satu bubble."
      },
      {
        "name": "mau_beli",
        "type": "boolean",
        "description": "True bila pelanggan ingin membeli."
      }
    ]
  }
}`,
  },
  {
    id: "send-message",
    type: "Send Message",
    tagline: { id: "Kirim balasan ke pelanggan", en: "Deliver a reply" },
    purpose: {
      id: "Mengirim teks ke channel percakapan dengan smart value, termasuk variabel dari node sebelumnya.",
      en: "Sends text to the conversation channel using smart values, including variables from earlier nodes.",
    },
    config: [
      {
        id: "Template pesan; gunakan {{variabel}} untuk nilai dinamis dan teks biasa untuk pesan statis.",
        en: "Message template; use {{variable}} for dynamic values and plain text for static messages.",
      },
    ],
    output: {
      id: "Pesan tersimpan di riwayat dan dikirim ke widget atau channel eksternal.",
      en: "The message is stored in history and delivered to the widget or external channel.",
    },
    notes: [
      {
        id: "Jika template hanya berisi satu token array, setiap item dikirim sebagai bubble terpisah.",
        en: "If the template contains a single array token, each item is sent as a separate bubble.",
      },
      {
        id: "Minimal satu Send Message atau Relocate diperlukan agar workflow dapat dijalankan.",
        en: "At least one Send Message or Relocate is required for a runnable workflow.",
      },
    ],
    schema: `{
  "id": "send-1",
  "type": "Send Message",
  "data": {
    "label": "Send Message",
    "nodeName": "Kirim balasan",
    "messageMode": "smart_value",
    "messageTemplate": "{{respons-ai.respond.replies}}"
  }
}`,
  },
  {
    id: "condition",
    type: "Condition",
    tagline: { id: "Percabangan If match / Else", en: "If match / Else branching" },
    purpose: {
      id: "Mengarahkan alur berdasarkan satu variabel boolean dari AI Agent atau node sebelumnya.",
      en: "Routes the flow based on one boolean variable from an AI Agent or an earlier node.",
    },
    config: [
      {
        id: "Pilih satu variabel boolean upstream, misalnya {{respons-ai.mau_beli}}.",
        en: "Pick one boolean upstream variable, for example {{respons-ai.mau_beli}}.",
      },
      {
        id: "Hubungkan port If match (true) dan Else (false) ke node berikutnya.",
        en: "Connect the If match (true) and Else (false) ports to the next nodes.",
      },
    ],
    output: {
      id: "Tidak menghasilkan variabel baru; hanya memilih cabang true atau false.",
      en: "Produces no new variables; it only selects the true or false branch.",
    },
    notes: [
      {
        id: "Nilai dianggap true untuk true, 1, yes, ya, on, angka bukan nol, dan array tidak kosong.",
        en: "Values count as true for true, 1, yes, ya, on, non-zero numbers, and non-empty arrays.",
      },
      {
        id: "Kedua cabang wajib terhubung sebelum workflow dapat dijalankan.",
        en: "Both branches must be connected before the workflow can run.",
      },
    ],
    schema: `{
  "id": "condition-1",
  "type": "Condition",
  "data": {
    "label": "Condition",
    "nodeName": "Pelanggan ingin membeli?",
    "conditionVariable": "respons-ai.mau_beli"
  }
}`,
  },
  {
    id: "go-to",
    type: "Go To",
    tagline: { id: "Lompat ke node atau workflow lain", en: "Jump to another node or workflow" },
    purpose: {
      id: "Melanjutkan eksekusi dari node tertentu, baik di workflow yang sama maupun workflow lain milik akun Anda.",
      en: "Continues execution from a specific node, either in the same workflow or another workflow you own.",
    },
    config: [
      {
        id: "Target workflow: kosongkan untuk workflow saat ini, atau pilih workflow lain.",
        en: "Target workflow: leave empty for the current workflow, or pick another one.",
      },
      {
        id: "Target node: node tujuan yang akan dijalankan berikutnya.",
        en: "Target node: the node that runs next.",
      },
      {
        id: "End flow: hentikan eksekusi setelah lompatan selesai.",
        en: "End flow: stop the execution after the jump completes.",
      },
    ],
    output: {
      id: "Tidak menghasilkan balasan langsung; eksekusi berlanjut di node tujuan.",
      en: "Produces no direct reply; execution continues at the target node.",
    },
    notes: [
      {
        id: "Go To adalah node terminal dan tidak boleh memiliki koneksi keluar.",
        en: "Go To is a terminal node and cannot have outgoing edges.",
      },
      {
        id: "Tandai satu Go To sebagai Set starting point bila workflow ini dipanggil dari workflow lain; hanya satu yang diperbolehkan.",
        en: "Mark one Go To as Set starting point when this workflow is called from another workflow; only one is allowed.",
      },
    ],
    schema: `{
  "id": "goto-1",
  "type": "Go To",
  "data": {
    "label": "Go To",
    "nodeName": "Lanjut ke closing",
    "targetWorkflowId": 36,
    "targetNodeId": "ai-closing",
    "endFlow": false,
    "setStartingPoint": false
  }
}`,
  },
  {
    id: "relocate",
    type: "Relocate",
    tagline: { id: "Alihkan ke admin", en: "Hand off to an admin" },
    purpose: {
      id: "Menghentikan balasan AI dan menandai sesi untuk ditangani manusia.",
      en: "Stops AI replies and marks the session for human handling.",
    },
    config: [
      {
        id: "Tidak ada konfigurasi tambahan; cukup beri nama yang jelas.",
        en: "No extra configuration; just give it a clear name.",
      },
    ],
    output: {
      id: "Sesi berstatus dieskalasi; AI tidak mengirim balasan untuk langkah ini.",
      en: "The session is escalated; AI sends no reply for this step.",
    },
    notes: [
      {
        id: "Relocate adalah node terminal dan tidak boleh memiliki koneksi keluar.",
        en: "Relocate is a terminal node and cannot have outgoing edges.",
      },
      {
        id: "Admin dapat membalas dari Inbox lalu mengembalikan sesi ke AI.",
        en: "Admins can reply from Inbox and then release the session back to AI.",
      },
    ],
    schema: `{
  "id": "relocate-1",
  "type": "Relocate",
  "data": {
    "label": "Relocate",
    "nodeName": "Alihkan ke admin"
  }
}`,
  },
  {
    id: "stopper",
    type: "Stopper",
    tagline: { id: "Jeda menunggu pesan berikutnya", en: "Pause and wait for the next message" },
    purpose: {
      id: "Menjeda workflow. Saat pelanggan mengirim pesan lagi, eksekusi dilanjutkan dari node yang terhubung setelah Stopper.",
      en: "Pauses the workflow. When the customer sends another message, execution resumes from the node connected after the Stopper.",
    },
    config: [
      {
        id: "Hubungkan satu koneksi keluar ke langkah yang harus dijalankan setelah pesan berikutnya.",
        en: "Connect one outgoing edge to the step that should run after the next message.",
      },
    ],
    output: {
      id: "Sesi berstatus menunggu hingga pesan baru masuk.",
      en: "The session waits until a new message arrives.",
    },
    notes: [
      {
        id: "Stopper wajib memiliki koneksi keluar.",
        en: "Stopper must have an outgoing edge.",
      },
      {
        id: "Gunakan untuk alur bertahap, misalnya menunggu konfirmasi sebelum melanjutkan.",
        en: "Use it for multi-turn flows, such as waiting for confirmation before continuing.",
      },
    ],
    schema: `{
  "id": "stopper-1",
  "type": "Stopper",
  "data": {
    "label": "Stopper",
    "nodeName": "Tunggu pesan berikutnya"
  }
}`,
  },
];

export const VARIABLES: HelpVariable[] = [
  {
    token: "{{customer_message}}",
    type: "string",
    description: {
      id: "Pesan terakhir dari pelanggan.",
      en: "The latest message from the customer.",
    },
  },
  {
    token: "{{customer_name}}",
    type: "string",
    description: {
      id: "Nama kontak bila tersedia (widget atau profil Telegram).",
      en: "The contact name when available (widget or Telegram profile).",
    },
  },
  {
    token: "{{agent.variable}}",
    type: "string / boolean / array",
    description: {
      id: "Output AI Agent. Nama agent menjadi namespace; gunakan nama node yang unik.",
      en: "AI Agent output. The agent name becomes the namespace; keep node names unique.",
    },
  },
  {
    token: "{{agent.array.itemField}}",
    type: "string",
    description: {
      id: "Satu item dari output array. Dipakai di Send Message untuk membuat bubble berurutan.",
      en: "One item from an array output. Used in Send Message to create sequential bubbles.",
    },
  },
];

export const EXAMPLES: HelpExample[] = [
  {
    id: "faq-bot",
    title: { id: "Bot FAQ sederhana", en: "Simple FAQ bot" },
    description: {
      id: "Pesan masuk dijawab AI, lalu dikirim kembali ke pelanggan.",
      en: "An incoming message is answered by AI and sent back to the customer.",
    },
    workflow: `{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "Trigger",
      "data": { "label": "Trigger", "nodeName": "Pesan masuk" }
    },
    {
      "id": "ai-1",
      "type": "AI Agent",
      "data": {
        "label": "AI Agent",
        "nodeName": "Respons AI",
        "provider": "gemini",
        "model": "gemini-3.8-flash",
        "systemMessage": "Jawab pertanyaan pelanggan dengan ringkas dan ramah.",
        "outputVariables": [
          {
            "name": "respond",
            "type": "array",
            "itemField": "replies",
            "description": "Balasan singkat; tiap item satu bubble."
          }
        ]
      }
    },
    {
      "id": "send-1",
      "type": "Send Message",
      "data": {
        "label": "Send Message",
        "nodeName": "Kirim balasan",
        "messageMode": "smart_value",
        "messageTemplate": "{{respons-ai.respond.replies}}"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "trigger-1", "target": "ai-1" },
    { "id": "e2", "source": "ai-1", "target": "send-1" }
  ]
}`,
  },
  {
    id: "qualify-handoff",
    title: { id: "Kualifikasi dan handoff", en: "Qualification and handoff" },
    description: {
      id: "AI menentukan minat pelanggan; cabang true dialihkan ke admin, cabang false dijawab AI.",
      en: "AI detects buying intent; the true branch goes to an admin, the false branch replies with AI.",
    },
    workflow: `{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "Trigger",
      "data": { "label": "Trigger", "nodeName": "Pesan masuk" }
    },
    {
      "id": "ai-1",
      "type": "AI Agent",
      "data": {
        "label": "AI Agent",
        "nodeName": "Respons AI",
        "provider": "gemini",
        "model": "gemini-3.8-flash",
        "systemMessage": "Bantu pelanggan dan nilai apakah ia siap membeli.",
        "outputVariables": [
          {
            "name": "respond",
            "type": "array",
            "itemField": "replies",
            "description": "Balasan untuk pelanggan."
          },
          {
            "name": "mau_beli",
            "type": "boolean",
            "description": "True bila pelanggan ingin membeli."
          }
        ]
      }
    },
    {
      "id": "send-1",
      "type": "Send Message",
      "data": {
        "label": "Send Message",
        "nodeName": "Kirim balasan",
        "messageMode": "smart_value",
        "messageTemplate": "{{respons-ai.respond.replies}}"
      }
    },
    {
      "id": "condition-1",
      "type": "Condition",
      "data": {
        "label": "Condition",
        "nodeName": "Ingin membeli?",
        "conditionVariable": "respons-ai.mau_beli"
      }
    },
    {
      "id": "relocate-1",
      "type": "Relocate",
      "data": { "label": "Relocate", "nodeName": "Alihkan ke admin" }
    },
    {
      "id": "send-2",
      "type": "Send Message",
      "data": {
        "label": "Send Message",
        "nodeName": "Tawarkan bantuan lanjutan",
        "messageMode": "smart_value",
        "messageTemplate": "Ada lagi yang bisa saya bantu?"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "trigger-1", "target": "ai-1" },
    { "id": "e2", "source": "ai-1", "target": "send-1" },
    { "id": "e3", "source": "send-1", "target": "condition-1" },
    {
      "id": "e4",
      "source": "condition-1",
      "target": "relocate-1",
      "sourceHandle": "true"
    },
    {
      "id": "e5",
      "source": "condition-1",
      "target": "send-2",
      "sourceHandle": "false"
    }
  ]
}`,
  },
  {
    id: "cross-workflow",
    title: { id: "Lanjut ke workflow lain", en: "Continue in another workflow" },
    description: {
      id: "Workflow konsultasi mengarahkan pelanggan ke alur closing lewat Go To.",
      en: "A consultation workflow routes the customer into a closing flow through Go To.",
    },
    workflow: `{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "Trigger",
      "data": { "label": "Trigger", "nodeName": "Pesan masuk" }
    },
    {
      "id": "goto-1",
      "type": "Go To",
      "data": {
        "label": "Go To",
        "nodeName": "Lanjut ke closing",
        "targetWorkflowId": 36,
        "targetNodeId": "ai-closing",
        "endFlow": false,
        "setStartingPoint": false
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "trigger-1", "target": "goto-1" }
  ]
}`,
  },
];

export const CHANNELS: HelpSection = {
  id: "channels",
  title: { id: "Channel dan widget", en: "Channels and widget" },
  intro: {
    id: "Satu widget website dan satu bot Telegram per akun. Keduanya memakai workflow entry.",
    en: "One website widget and one Telegram bot per account. Both use an entry workflow.",
  },
  blocks: [
    {
      title: { id: "Widget website", en: "Website widget" },
      body: {
        id: "Buka Channel → widget, pilih workflow entry, lalu salin snippet ke website sebelum tag </body>. Aktifkan widget agar pelanggan dapat memulai chat.",
        en: "Open Channel → widget, choose an entry workflow, then paste the snippet into your site before the </body> tag. Activate the widget so customers can start chatting.",
      },
    },
    {
      title: { id: "Bot Telegram", en: "Telegram bot" },
      body: {
        id: "Buat bot di @BotFather, salin token, lalu hubungkan di Channel → Telegram. Pesan diambil dengan long polling sehingga tidak perlu URL publik.",
        en: "Create a bot with @BotFather, copy the token, then connect it in Channel → Telegram. Messages use long polling, so no public URL is required.",
      },
    },
    {
      title: { id: "Menjalankan poller", en: "Running the poller" },
      body: {
        id: "Saat memakai CLI, poller berjalan otomatis bersama orqiva start. Dari source, jalankan php artisan channels:telegram-poll; queue worker tetap wajib berjalan.",
        en: "With the CLI, the poller starts automatically with orqiva start. From source, run php artisan channels:telegram-poll; the queue worker must still be running.",
      },
    },
  ],
};

export const INBOX: HelpSection = {
  id: "inbox",
  title: { id: "Inbox dan human handoff", en: "Inbox and human handoff" },
  intro: {
    id: "AI menangani percakapan otomatis; admin dapat mengambil alih kapan saja.",
    en: "AI handles conversations automatically; admins can take over at any time.",
  },
  blocks: [
    {
      body: {
        id: "Inbox menampilkan kontak dan sesi terbaru. Buka sesi untuk melihat riwayat, status, dan channel asal.",
        en: "Inbox lists recent contacts and sessions. Open a session to see history, status, and the source channel.",
      },
    },
    {
      body: {
        id: "Ambil alih sesi untuk membalas manual. Setelah selesai, kembalikan sesi ke AI agar balasan otomatis berlanjut.",
        en: "Take over a session to reply manually. When finished, release it back to AI so automated replies continue.",
      },
    },
    {
      body: {
        id: "Node Relocate menandai sesi untuk admin tanpa mengirim balasan AI pada langkah tersebut.",
        en: "A Relocate node marks the session for an admin without sending an AI reply at that step.",
      },
    },
  ],
};

export const AUDIT: HelpSection = {
  id: "audit",
  title: { id: "Audit dan pemecahan masalah", en: "Audit and troubleshooting" },
  intro: {
    id: "Setiap langkah mencatat input, output, token, dan error agar kegagalan mudah ditelusuri.",
    en: "Every step records input, output, tokens, and errors so failures are easy to trace.",
  },
  blocks: [
    {
      title: { id: "Workflow gagal", en: "Workflow failed" },
      body: {
        id: "Buka Audit Log, pilih eksekusi yang gagal, lalu periksa langkah dengan status gagal dan pesan perbaikannya. Setelah diperbaiki, jalankan ulang atau lanjutkan dari checkpoint.",
        en: "Open Audit Log, pick the failed execution, then inspect the failing step and its suggested fix. After fixing it, re-run or resume from the checkpoint.",
      },
    },
    {
      title: { id: "Tidak ada balasan", en: "No reply" },
      body: {
        id: "Pastikan channel aktif, workflow entry memiliki Trigger dan Send Message/Relocate, provider AI punya API key, lalu periksa queue worker.",
        en: "Make sure the channel is active, the entry workflow has a Trigger and Send Message/Relocate, the AI provider has an API key, then check the queue worker.",
      },
    },
    {
      title: { id: "Widget tidak muncul", en: "Widget does not appear" },
      body: {
        id: "Pastikan snippet terpasang sebelum </body>, token channel masih berlaku, dan domain situs diizinkan oleh konfigurasi CORS.",
        en: "Make sure the snippet is placed before </body>, the channel token is still valid, and the site domain is allowed by the CORS configuration.",
      },
    },
  ],
};

export const SECURITY: HelpSection = {
  id: "security",
  title: { id: "Keamanan dan data", en: "Security and data" },
  intro: {
    id: "Orqiva berjalan lokal dan menyimpan data di perangkat atau server Anda.",
    en: "Orqiva runs locally and keeps data on your device or server.",
  },
  blocks: [
    {
      body: {
        id: "API key provider disimpan terenkripsi di database dan tidak pernah dikirim kembali ke browser.",
        en: "Provider API keys are encrypted in the database and are never sent back to the browser.",
      },
    },
    {
      body: {
        id: "Setiap workflow, channel, kontak, dan sesi dimiliki oleh akun pembuatnya. Kredensial channel juga disimpan terenkripsi.",
        en: "Every workflow, channel, contact, and session belongs to its creator. Channel credentials are encrypted as well.",
      },
    },
    {
      body: {
        id: "Untuk akses publik, gunakan HTTPS lewat reverse proxy, aktifkan autentikasi yang kuat, dan backup database serta APP_KEY secara berkala.",
        en: "For public access, use HTTPS behind a reverse proxy, enforce strong authentication, and back up the database and APP_KEY regularly.",
      },
    },
  ],
};

export const SECTIONS: HelpSection[] = [
  QUICK_START,
  CONCEPTS,
  {
    id: "nodes",
    title: { id: "Referensi node", en: "Node reference" },
    intro: {
      id: "Tujuh node yang tersedia di editor, lengkap dengan konfigurasi dan contoh schema.",
      en: "The seven nodes available in the editor, with configuration and schema examples.",
    },
    blocks: [],
  },
  {
    id: "variables",
    title: { id: "Variabel dan templating", en: "Variables and templating" },
    intro: {
      id: "Gunakan {{token}} di system prompt dan template pesan. Variabel berasal dari Trigger atau output AI Agent.",
      en: "Use {{token}} in system prompts and message templates. Variables come from the Trigger or AI Agent outputs.",
    },
    blocks: [],
  },
  {
    id: "examples",
    title: { id: "Contoh workflow", en: "Workflow examples" },
    intro: {
      id: "Tiga pola umum: FAQ, kualifikasi dengan handoff, dan perpindahan antar-workflow.",
      en: "Three common patterns: FAQ, qualification with handoff, and cross-workflow routing.",
    },
    blocks: [],
  },
  CHANNELS,
  INBOX,
  AUDIT,
  SECURITY,
];

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  LoaderCircle,
  Send,
  User,
  XCircle,
} from "lucide-react";

import { executeWorkflow, getWorkflow } from "../services/workflow";
import type { Workflow } from "../types/workflow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface WorkflowChatProps {
  workflowId: string;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function extractReply(output: unknown): string {
  if (typeof output === "string" && output.trim()) {
    return output;
  }

  if (!output || typeof output !== "object") {
    return "";
  }

  const data = output as Record<string, unknown>;

  // Prioritaskan jawaban AI dari hasil node workflow.
  if (typeof data.output === "string" && data.output.trim()) {
    return data.output;
  }

  if (typeof data.ai_response === "string" && data.ai_response.trim()) {
    return data.ai_response;
  }

  if (typeof data.response === "string" && data.response.trim()) {
    return data.response;
  }

  if (typeof data.text === "string" && data.text.trim()) {
    return data.text;
  }

  // Periksa context jika jawaban belum ditemukan.
  if (data.context && typeof data.context === "object") {
    const context = data.context as Record<string, unknown>;

    if (typeof context.ai_response === "string" && context.ai_response.trim()) {
      return context.ai_response;
    }

    if (typeof context.message === "string" && context.message.trim()) {
      return context.message;
    }
  }

  // Jangan tampilkan pesan status sebagai jawaban AI.
  return "";
}

export default function WorkflowChat({
  workflowId,
  onBack,
}: WorkflowChatProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<
    "idle" | "success" | "failed"
  >("idle");
  const [executionError, setExecutionError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [conversationId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let active = true;

    getWorkflow(workflowId)
      .then((result) => {
        if (active) setWorkflow(result);
      })
      .catch(() => {
        if (active) {
          setLoadError("Workflow gagal dimuat. Periksa koneksi backend.");
        }
      })
      .finally(() => {
        if (active) setLoadingWorkflow(false);
      });

    return () => {
      active = false;
    };
  }, [workflowId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = draft.trim();
    if (!text || sending || !workflow) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setSending(true);
    setExecutionStatus("idle");
    setExecutionError("");

    try {
      const result = await executeWorkflow(workflowId, {
        message: text,
        customer_message: text,
        customer_name: "Pengunjung",
        conversation_id: conversationId,
      });

      const data = result.data;

      if (data.status === "waiting") {
        setExecutionStatus("idle");
        return;
      }

      if (data.status !== "success") {
        throw new Error(
          data.error || result.message || "Workflow gagal dieksekusi.",
        );
      }

      const reply = extractReply(data.output);

      if (!reply) {
        throw new Error(
          "Workflow berhasil dijalankan, tetapi balasan tidak ditemukan pada output.",
        );
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
        },
      ]);
      setExecutionStatus("success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menjalankan workflow.";

      setExecutionStatus("failed");
      setExecutionError(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl flex-col">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onBack} className="h-10 px-4">
            <ArrowLeft />
            Back to workflows
          </Button>

          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Workflow testing
          </span>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center gap-3 border-b border-border p-4 sm:p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Bot size={22} />
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold text-foreground">
                {loadingWorkflow
                  ? "Loading workflow..."
                  : workflow?.name || "Workflow Chat"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Test the responses generated by this workflow.
              </p>
            </div>
          </header>

          {loadError ? (
            <div
              role="alert"
              className="m-5 rounded-xl border border-destructive/20 bg-destructive/[0.06] p-4 text-sm text-destructive"
            >
              {loadError}
            </div>
          ) : loadingWorkflow ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle size={20} className="animate-spin" />
              Loading workflow...
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                {messages.length === 0 && (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/50 text-primary">
                      <Bot size={28} />
                    </span>
                    <h2 className="mt-4 font-semibold text-foreground">
                      Test your workflow
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                      Send a message below to execute this workflow and inspect
                      the AI response.
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                        message.role === "user"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User size={16} />
                      ) : (
                        <Bot size={17} />
                      )}
                    </span>

                    <div
                      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-muted/60 text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle size={16} className="animate-spin" />
                    Workflow sedang dijalankan...
                  </div>
                )}

                {executionStatus === "success" && (
                  <p className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 size={14} />
                    Workflow berhasil dieksekusi.
                  </p>
                )}

                {executionStatus === "failed" && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-destructive/[0.06] p-3 text-sm text-destructive"
                  >
                    <p className="flex items-center gap-2 font-medium">
                      <XCircle size={16} />
                      Workflow gagal
                    </p>
                    <p className="mt-2 break-words">{executionError}</p>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-border p-3 sm:p-4"
              >
                <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-primary/50">
                  <Textarea
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Type a message to test your workflow..."
                    aria-label="Test message"
                    disabled={sending}
                    className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-foreground shadow-none focus-visible:ring-0 dark:bg-transparent"
                  />

                  <Button
                    type="submit"
                    size="icon-lg"
                    aria-label="Send message"
                    disabled={sending || !draft.trim()}
                    className="shrink-0"
                  >
                    {sending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Send />
                    )}
                  </Button>
                </div>
                <p className="mt-2 px-1 text-xs text-muted-foreground/70">
                  Enter to send · Shift + Enter for a new line
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

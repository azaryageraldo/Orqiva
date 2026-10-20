import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  KeyRound,
  LifeBuoy,
  LoaderCircle,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "../services/auth";

type Health = "checking" | "online" | "offline";

interface SettingsProps {
  health: Health;
  onOpenAiProviders: () => void;
}

const HEALTH: Record<Health, { label: string; className: string }> = {
  online: {
    label: "Operational",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  offline: {
    label: "Offline",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  checking: {
    label: "Memeriksa",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
};

const DOCS = [
  { label: "OpenAI API keys", href: "https://platform.openai.com/api-keys" },
  { label: "Google Gemini API", href: "https://aistudio.google.com/app/apikey" },
  {
    label: "OpenRouter Quickstart",
    href: "https://openrouter.ai/docs/quickstart",
  },
];

export default function Settings({
  health,
  onOpenAiProviders,
}: SettingsProps) {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const status = HEALTH[health];

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((result) => {
        if (active) setUser(result);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            <SlidersHorizontal className="size-4" />
            Preferences
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Profil akun, koneksi provider AI, dan status layanan workspace.
          </p>
        </div>

        <Card className="border-primary/20 bg-[linear-gradient(145deg,rgba(59,130,246,0.10),rgba(15,23,42,0.18))]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <KeyRound className="size-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    Koneksi AI
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-primary/25 bg-primary/10 text-primary"
                  >
                    BYOK
                  </Badge>
                </div>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Kelola API key Gemini, OpenAI, dan OpenRouter. Key yang
                  tersimpan langsung dipakai workflow tanpa mengubah `.env`.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onOpenAiProviders}
              className="w-full shrink-0 sm:w-auto"
            >
              Kelola API Keys
              <ArrowUpRight />
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                Akun
              </CardTitle>
              <CardDescription>
                Profil pengguna yang sedang aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Nama</span>
                <span className="text-sm font-medium text-foreground">
                  {loading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    user?.name || "Tidak diketahui"
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="truncate text-sm font-medium text-foreground">
                  {loading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    user?.email || "Tidak diketahui"
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                Status layanan
              </CardTitle>
              <CardDescription>
                Koneksi frontend dengan backend FlowPilot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Backend API
                </span>
                <Badge
                  variant="outline"
                  className={`h-6 px-2.5 ${status.className}`}
                >
                  {status.label}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Pencatatan token
                </span>
                <Badge
                  variant="outline"
                  className="h-6 border-primary/30 bg-primary/10 px-2.5 text-primary"
                >
                  Aktif
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Penyimpanan API key
                </span>
                <span className="text-xs font-medium text-emerald-300">
                  Terenkripsi
                </span>
              </div>
            </CardContent>
          </Card>

          <Card id="settings-support" className="lg:col-span-2">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="size-4 text-muted-foreground" />
                Bantuan &amp; dukungan
              </CardTitle>
              <CardDescription>
                Dokumentasi dan halaman untuk membuat API key provider AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 pt-2 sm:grid-cols-2">
              {DOCS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3 text-sm text-foreground transition hover:border-primary/30 hover:bg-primary/[0.06]"
                >
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="size-4 text-muted-foreground" />
                    {item.label}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" />
                </a>
              ))}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3.5 py-3 text-sm text-muted-foreground sm:col-span-2">
                <Mail className="size-4" />
                Hubungi administrator workspace untuk bantuan akun dan akses.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

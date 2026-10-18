import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  LifeBuoy,
  LoaderCircle,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  { label: "OpenRouter Quickstart", href: "https://openrouter.ai/docs/quickstart" },
  { label: "Koleksi model gratis", href: "https://openrouter.ai/collections/free-models" },
  { label: "Google Gemini API", href: "https://ai.google.dev/gemini-api/docs" },
];

export default function Settings({ health }: SettingsProps) {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

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

  const status = HEALTH[health];

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            <SlidersHorizontal className="size-4" />
            Preferences
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            Informasi akun, status layanan, dan referensi dokumentasi.
          </p>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              Akun
            </CardTitle>
            <CardDescription>Profil pengguna yang sedang aktif.</CardDescription>
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
              <span className="text-sm font-medium text-foreground">
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
              <span className="text-sm text-muted-foreground">Backend API</span>
              <Badge variant="outline" className={`h-6 px-2.5 ${status.className}`}>
                {status.label}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Pencatatan token
              </span>
              <Badge variant="outline" className="h-6 border-primary/30 bg-primary/10 px-2.5 text-primary">
                Aktif
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card id="settings-support">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-muted-foreground" />
              Bantuan &amp; dukungan
            </CardTitle>
            <CardDescription>
              Dokumentasi dan kanal bantuan untuk model AI yang dipakai.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {DOCS.map((doc) => (
              <a
                key={doc.href}
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 text-sm text-foreground transition hover:border-ring/50 hover:bg-muted/50"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="size-4 text-muted-foreground" />
                  {doc.label}
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </a>
            ))}

            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              Hubungi administrator workspace untuk bantuan akun dan akses.
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          FlowPilot AI · MVP · Automation workspace
        </p>
      </div>
    </section>
  );
}

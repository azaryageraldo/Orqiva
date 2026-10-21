import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  KeyRound,
  LoaderCircle,
  Pencil,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { getCurrentUser } from "../services/auth";
import { updateProfile, type ProfileUser } from "../services/profile";

type Health = "checking" | "online" | "offline";

interface SettingsProps {
  health: Health;
  onOpenAiProviders: () => void;
  onProfileUpdated?: (user: ProfileUser) => void;
}

const HEALTH_STYLES: Record<Health, string> = {
  online:
    "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  offline: "border-destructive/30 bg-destructive/10 text-destructive",
  checking:
    "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300",
};

function extractProfileError(error: unknown): "current_password" | "generic" {
  const response = (error as { response?: { status?: number; data?: unknown } })
    ?.response;
  const data = response?.data as
    | { errors?: { current_password?: string[] }; message?: string }
    | undefined;

  if (
    response?.status === 422 &&
    (data?.errors?.current_password?.length ||
      /password saat ini|current password/i.test(data?.message ?? ""))
  ) {
    return "current_password";
  }

  return "generic";
}

export default function Settings({
  health,
  onOpenAiProviders,
  onProfileUpdated,
}: SettingsProps) {
  const { t } = useI18n();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");

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

  function openEditor() {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setCurrentPassword("");
    setProfileError("");
    setProfileNotice("");
    setEditing(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");
    setProfileNotice("");

    if (password && !currentPassword) {
      setProfileError(t("settings.profileErrorCurrent"));
      return;
    }

    setSaving(true);

    try {
      const updated = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        password: password || undefined,
        current_password: password ? currentPassword : undefined,
      });

      setUser(updated);
      onProfileUpdated?.(updated);
      setEditing(false);
      setPassword("");
      setCurrentPassword("");
      setProfileNotice(t("settings.profileSaved"));
    } catch (error) {
      setProfileError(
        extractProfileError(error) === "current_password"
          ? t("settings.profileErrorCurrent")
          : t("settings.profileError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            <SlidersHorizontal className="size-4" />
            {t("settings.eyebrow")}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("settings.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("settings.subtitle")}
          </p>
        </div>

        <Card className="border-primary/20 bg-[linear-gradient(145deg,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_60%)]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <KeyRound className="size-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {t("settings.aiTitle")}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-primary/25 bg-primary/10 text-primary"
                  >
                    BYOK
                  </Badge>
                </div>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  {t("settings.aiDescription")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onOpenAiProviders}
              className="w-full shrink-0 sm:w-auto"
            >
              {t("settings.manageKeys")}
              <ArrowUpRight />
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    {t("settings.account")}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.accountDescription")}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openEditor}
                  disabled={loading}
                >
                  <Pencil />
                  {t("settings.profileEdit")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {t("settings.name")}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {loading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    user?.name || t("common.unknown")
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {t("settings.email")}
                </span>
                <span className="truncate text-sm font-medium text-foreground">
                  {loading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    user?.email || t("common.unknown")
                  )}
                </span>
              </div>
              {profileNotice && (
                <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  {profileNotice}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                {t("settings.status")}
              </CardTitle>
              <CardDescription>
                {t("settings.statusDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {t("settings.backend")}
                </span>
                <Badge
                  variant="outline"
                  className={`h-6 px-2.5 ${HEALTH_STYLES[health]}`}
                >
                  {t(`health.${health === "online" ? "operational" : health}`)}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {t("settings.tokenTracking")}
                </span>
                <Badge
                  variant="outline"
                  className="h-6 border-primary/30 bg-primary/10 px-2.5 text-primary"
                >
                  {t("common.active")}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {t("settings.keyStorage")}
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                  {t("settings.encrypted")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.profileEdit")}</DialogTitle>
            <DialogDescription>
              {t("settings.profileHint")}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t("settings.profileName")}</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">
                {t("settings.profileEmail")}
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="profile-password">
                {t("settings.profilePassword")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.profilePasswordOptional")}
              </p>
              <Input
                id="profile-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-current-password">
                {t("settings.currentPassword")}
              </Label>
              <Input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required={Boolean(password)}
              />
            </div>

            {profileError && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {profileError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircle className="animate-spin" />}
                {saving ? t("settings.saving") : t("settings.saveProfile")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

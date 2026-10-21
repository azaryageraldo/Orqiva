import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import Login from "./Login";
import { getCurrentUser, logout } from "./services/auth";
import { UNAUTHORIZED_EVENT } from "./services/api";
import DashboardLayout from "./components/layout/DashboardLayout";
import { Button } from "./components/ui/button";
import Dashboard from "./pages/Dashboard";
import Workflows from "./pages/Workflows";
import WorkflowEditor from "./pages/WorkflowEditor";
import Activity from "./pages/Activity";
import Inbox from "./pages/Inbox";
import Channel from "./pages/Channel";
import AiProviders from "./pages/AiProviders";
import PublicChatWidget from "./pages/PublicChatWidget";
import ExecutionDetail from "./pages/ExecutionDetail";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import { useI18n } from "./lib/i18n";
import "./App.css";

type Health = "checking" | "online" | "offline";
type View =
  | "dashboard"
  | "workflows"
  | "inbox"
  | "channel"
  | "activity"
  | "ai-providers"
  | "settings"
  | "help";

type CurrentUser = { name: string; email: string };

function ErrorBanner({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:mx-6 lg:mx-8"
    >
      <span>{message}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="text-destructive hover:text-destructive"
      >
        {t("common.close")}
      </Button>
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  const [health, setHealth] = useState<Health>("checking");
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("dashboard");

  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(
    null,
  );

  const [viewingExecution, setViewingExecution] = useState<{
    workflowId: string;
    executionId: number;
  } | null>(null);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setAuthenticated(true);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setAuthenticated(false);
      })
      .finally(() => {
        if (active) setAuthChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthenticated(false);
      setUser(null);
      setEditingWorkflowId(null);
      setViewingExecution(null);
      setView("dashboard");
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/v1/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("API unavailable");
        }

        setHealth("online");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHealth("offline");
        }
      });

    return () => controller.abort();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await logout();
      setAuthenticated(false);
      setUser(null);
      setEditingWorkflowId(null);
      setViewingExecution(null);
      setView("dashboard");
    } catch {
      setError(t("auth.logoutError"));
    } finally {
      setLoggingOut(false);
    }
  }

  const goTo = (next: View, section?: string) => {
    setError("");
    setEditingWorkflowId(null);
    setViewingExecution(null);
    setView(next);

    if (section) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document
            .getElementById(section)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
  };

  const openWorkflow = (workflowId: string) => {
    setError("");
    setViewingExecution(null);
    setEditingWorkflowId(workflowId);
  };

  const publicWidgetToken =
    window.location.pathname.match(/^\/widget\/([^/]+)\/?$/)?.[1] ?? null;

  if (publicWidgetToken) {
    return <PublicChatWidget token={publicWidgetToken} />;
  }

  if (authChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <LoaderCircle className="size-7 animate-spin text-primary" />
        <p>{t("auth.checking")}</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Login
        onLogin={(currentUser) => {
          setUser(currentUser);
          setAuthenticated(true);
        }}
      />
    );
  }

  const layoutProps = {
    health,
    user,
    loggingOut,
    onLogout: () => void handleLogout(),
    onDashboardClick: () => goTo("dashboard"),
    onWorkflowsClick: () => goTo("workflows"),
    onInboxClick: () => goTo("inbox"),
    onChannelClick: () => goTo("channel"),
    onActivityClick: () => goTo("activity"),
    onAiProvidersClick: () => goTo("ai-providers"),
    onHelpClick: () => goTo("help"),
    onSettingsClick: () => goTo("settings"),
  };

  // Halaman editor workflow
  if (editingWorkflowId !== null) {
    return (
      <DashboardLayout
        title={t("nav.workflows")}
        icon="editor"
        activeNav="workflows"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <WorkflowEditor
          workflowId={editingWorkflowId}
          onBack={() => goTo("workflows")}
        />
      </DashboardLayout>
    );
  }

  // Halaman detail eksekusi (audit per langkah)
  if (viewingExecution !== null) {
    return (
      <DashboardLayout
        title={t("nav.activity")}
        icon="activity"
        activeNav="activity"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <ExecutionDetail
          workflowId={viewingExecution.workflowId}
          executionId={viewingExecution.executionId}
          onBack={() => goTo("activity")}
        />
      </DashboardLayout>
    );
  }

  if (view === "dashboard") {
    return (
      <DashboardLayout
        title={t("nav.dashboard")}
        icon="dashboard"
        activeNav="dashboard"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Dashboard health={health} onViewActivity={() => goTo("activity")} />
      </DashboardLayout>
    );
  }

  if (view === "inbox") {
    return (
      <DashboardLayout
        title={t("nav.inbox")}
        icon="inbox"
        activeNav="inbox"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Inbox />
      </DashboardLayout>
    );
  }

  if (view === "channel") {
    return (
      <DashboardLayout
        title={t("nav.channel")}
        icon="channel"
        activeNav="channel"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Channel />
      </DashboardLayout>
    );
  }

  if (view === "activity") {
    return (
      <DashboardLayout
        title={t("nav.activity")}
        icon="activity"
        activeNav="activity"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Activity
          onOpenWorkflow={openWorkflow}
          onOpenExecution={(execution) => {
            setError("");
            setEditingWorkflowId(null);
            setViewingExecution({
              workflowId: String(execution.workflow_id),
              executionId: execution.id,
            });
          }}
        />
      </DashboardLayout>
    );
  }

  if (view === "ai-providers") {
    return (
      <DashboardLayout
        title={t("nav.apiKeys")}
        icon="keys"
        activeNav="ai-providers"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <AiProviders />
      </DashboardLayout>
    );
  }

  if (view === "help") {
    return (
      <DashboardLayout
        title={t("nav.help")}
        icon="help"
        activeNav="help"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Help
          onOpenAiProviders={() => goTo("ai-providers")}
          onOpenWorkflows={() => goTo("workflows")}
          onOpenChannel={() => goTo("channel")}
        />
      </DashboardLayout>
    );
  }

  if (view === "settings") {
    return (
      <DashboardLayout
        title={t("nav.settings")}
        icon="settings"
        activeNav="settings"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Settings
          health={health}
          onOpenAiProviders={() => goTo("ai-providers")}
          onProfileUpdated={setUser}
        />
      </DashboardLayout>
    );
  }

  // Halaman daftar workflow
  return (
    <DashboardLayout
      title={t("nav.workflows")}
      icon="workflows"
      activeNav="workflows"
      {...layoutProps}
    >
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      <Workflows onOpenWorkflow={openWorkflow} />
    </DashboardLayout>
  );
}

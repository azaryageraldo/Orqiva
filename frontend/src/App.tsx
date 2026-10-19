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
import WorkflowChat from "./pages/WorkflowChat";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import "./App.css";

type Health = "checking" | "online" | "offline";
type View = "dashboard" | "workflows" | "activity" | "settings";

function ErrorBanner({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
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
        Tutup
      </Button>
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState<Health>("checking");
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("dashboard");

  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(
    null,
  );

  const [testingWorkflowId, setTestingWorkflowId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("testWorkflow"),
  );

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then(() => {
        if (active) setAuthenticated(true);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
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
      setEditingWorkflowId(null);
      setTestingWorkflowId(null);
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
      setEditingWorkflowId(null);
      setTestingWorkflowId(null);
      setView("dashboard");
    } catch {
      setError("Logout gagal. Silakan coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  }

  const clearWorkflowUrls = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("testWorkflow");
    window.history.replaceState({}, "", url);
  };

  const goTo = (next: View, section?: string) => {
    setError("");
    setEditingWorkflowId(null);
    setTestingWorkflowId(null);
    clearWorkflowUrls();
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
    setTestingWorkflowId(null);
    setEditingWorkflowId(workflowId);
  };

  if (authChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <LoaderCircle className="size-7 animate-spin text-primary" />
        <p>Memeriksa sesi login...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Login
        onLogin={() => {
          setAuthenticated(true);
        }}
      />
    );
  }

  const layoutProps = {
    health,
    loggingOut,
    onLogout: () => void handleLogout(),
    onDashboardClick: () => goTo("dashboard"),
    onWorkflowsClick: () => goTo("workflows"),
    onActivityClick: () => goTo("activity"),
    onHelpClick: () => goTo("settings", "settings-support"),
    onSettingsClick: () => goTo("settings"),
  };

  // Halaman editor workflow
  if (editingWorkflowId !== null) {
    return (
      <DashboardLayout
        title="Workflow editor"
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

  // Halaman Chat Widget untuk menguji workflow
  if (testingWorkflowId !== null) {
    return (
      <DashboardLayout
        title="Test Chat Widget"
        icon="chat"
        activeNav="workflows"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <WorkflowChat
          workflowId={testingWorkflowId}
          onBack={() => goTo("workflows")}
        />
      </DashboardLayout>
    );
  }

  if (view === "dashboard") {
    return (
      <DashboardLayout
        title="Dashboard"
        icon="dashboard"
        activeNav="dashboard"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Dashboard health={health} onViewActivity={() => goTo("activity")} />
      </DashboardLayout>
    );
  }

  if (view === "activity") {
    return (
      <DashboardLayout
        title="Activity"
        icon="activity"
        activeNav="activity"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Activity onOpenWorkflow={openWorkflow} />
      </DashboardLayout>
    );
  }

  if (view === "settings") {
    return (
      <DashboardLayout
        title="Settings"
        icon="settings"
        activeNav="settings"
        {...layoutProps}
      >
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}

        <Settings health={health} />
      </DashboardLayout>
    );
  }

  // Halaman daftar workflow
  return (
    <DashboardLayout
      title="Workflows"
      icon="workflows"
      activeNav="workflows"
      {...layoutProps}
    >
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      <Workflows
        onOpenWorkflow={openWorkflow}
        onTestWorkflow={(workflowId) => {
          const testUrl = new URL(window.location.href);
          testUrl.searchParams.set("testWorkflow", workflowId);
          window.open(testUrl.toString(), "_blank", "noopener,noreferrer");
        }}
      />
    </DashboardLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import Login from "./Login";
import { getCurrentUser, logout } from "./services/auth";
import { UNAUTHORIZED_EVENT } from "./services/api";
import DashboardLayout from "./components/layout/DashboardLayout";
import type { NavKey } from "./components/layout/Sidebar";
import { Button } from "./components/ui/button";
import Dashboard from "./pages/Dashboard";
import Workflows from "./pages/workflows";
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
type CurrentUser = { name: string; email?: string };

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

function WorkflowEditorWrapper() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  return (
    <WorkflowEditor
      workflowId={workflowId!}
      onBack={() => navigate("/workflows")}
    />
  );
}

function ExecutionDetailWrapper() {
  const { workflowId, executionId } = useParams<{
    workflowId: string;
    executionId: string;
  }>();
  const navigate = useNavigate();
  return (
    <ExecutionDetail
      workflowId={workflowId!}
      executionId={Number(executionId)}
      onBack={() => navigate("/activity")}
      onNavigate={(key) => navigate(`/${key}`)}
    />
  );
}

function PublicWidgetWrapper() {
  const { token } = useParams<{ token: string }>();
  return <PublicChatWidget token={token!} />;
}

export default function App() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const [health, setHealth] = useState<Health>("checking");
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const activeNav: NavKey = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/workflows")) return "workflows";
    if (path.startsWith("/activity")) return "activity";
    if (path.startsWith("/inbox")) return "inbox";
    if (path.startsWith("/channel")) return "channel";
    if (path.startsWith("/ai-providers")) return "ai-providers";
    if (path.startsWith("/settings")) return "settings";
    if (path.startsWith("/help")) return "help";
    return "dashboard";
  }, [location.pathname]);

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
      navigate("/dashboard");
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [navigate]);

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
      navigate("/dashboard");
    } catch {
      setError(t("auth.logoutError"));
    } finally {
      setLoggingOut(false);
    }
  }

  // Standalone public chat widget route
  if (location.pathname.startsWith("/widget/")) {
    return (
      <Routes>
        <Route path="/widget/:token" element={<PublicWidgetWrapper />} />
      </Routes>
    );
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

  return (
    <DashboardLayout
      activeNav={activeNav}
      health={health}
      user={user}
      loggingOut={loggingOut}
      onLogout={() => void handleLogout()}
      onDashboardClick={() => navigate("/dashboard")}
      onWorkflowsClick={() => navigate("/workflows")}
      onInboxClick={() => navigate("/inbox")}
      onChannelClick={() => navigate("/channel")}
      onActivityClick={() => navigate("/activity")}
      onAiProvidersClick={() => navigate("/ai-providers")}
      onHelpClick={() => navigate("/help")}
      onSettingsClick={() => navigate("/settings")}
    >
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <Dashboard
              health={health}
              onViewActivity={() => navigate("/activity")}
            />
          }
        />
        <Route
          path="/workflows"
          element={
            <Workflows
              onOpenWorkflow={(id) => navigate(`/workflows/${id}`)}
              currentUserName={user?.name ?? ""}
            />
          }
        />
        <Route
          path="/workflows/:workflowId"
          element={<WorkflowEditorWrapper />}
        />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/channel" element={<Channel />} />
        <Route
          path="/activity"
          element={
            <Activity
              onOpenExecution={(executionId, workflowId) =>
                navigate(`/activity/${workflowId}/${executionId}`)
              }
            />
          }
        />
        <Route
          path="/activity/:workflowId/:executionId"
          element={<ExecutionDetailWrapper />}
        />
        <Route path="/ai-providers" element={<AiProviders />} />
        <Route
          path="/settings"
          element={
            <Settings
              health={health}
              onOpenAiProviders={() => navigate("/ai-providers")}
              onProfileUpdated={setUser}
            />
          }
        />
        <Route
          path="/help"
          element={
            <Help
              onOpenAiProviders={() => navigate("/ai-providers")}
              onOpenWorkflows={() => navigate("/workflows")}
              onOpenChannel={() => navigate("/channel")}
            />
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

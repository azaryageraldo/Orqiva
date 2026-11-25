import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { LoaderCircle, LucideProvider } from "lucide-react";

import Login from "./Login";
import { getCurrentUser, logout } from "./services/auth";
import { UNAUTHORIZED_EVENT } from "./services/api";
import { getActivity } from "./services/stats";
import DashboardLayout from "./components/layout/DashboardLayout";
import type { NavKey } from "./components/layout/Sidebar";
import { Button } from "./components/ui/button";
import { useI18n } from "./lib/i18n";
import "./App.css";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Workflows = lazy(() => import("./pages/workflows"));
const Datapoints = lazy(() => import("./pages/Datapoints"));
const Data = lazy(() => import("./pages/Data"));
const WorkflowEditor = lazy(() => import("./pages/WorkflowEditor"));
const Activity = lazy(() => import("./pages/Activity"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Channel = lazy(() => import("./pages/Channel"));
const AiProviders = lazy(() => import("./pages/AiProviders"));
const PublicChatWidget = lazy(() => import("./pages/PublicChatWidget"));
const ExecutionDetail = lazy(() => import("./pages/ExecutionDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Help = lazy(() => import("./pages/Help"));

function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center p-12 text-muted-foreground">
      <LoaderCircle className="size-6 animate-spin text-primary" />
    </div>
  );
}

type Health = "checking" | "online" | "offline";
type CurrentUser = { name: string; email?: string };

type NotificationItem = {
  id: string;
  type:
    | "workflow.created"
    | "workflow.error"
    | "api.key.added"
    | "api.key.edited"
    | "profile.updated"
    | "login"
    | "message.received";
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
  url?: string;
};

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [queueHealth, setQueueHealth] = useState<{
    driver: string;
    pending_jobs: number;
    stalled_jobs: number;
    worker_status: "idle" | "stalled";
  } | null>(null);

  const markAsRead = useCallback((id: string) => {
    try {
      const stored = localStorage.getItem("orqiva_read_notifs");
      const list = stored ? JSON.parse(stored) : [];
      if (!list.includes(id)) {
        localStorage.setItem("orqiva_read_notifs", JSON.stringify([...list, id]));
      }
    } catch {
      // Ignore storage write errors in restricted browsing contexts.
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const onNotificationClick = useCallback(
    (item: NotificationItem) => {
      markAsRead(item.id);
      if (item.url) {
        navigate(item.url);
      }
    },
    [navigate, markAsRead],
  );

  const activeNav: NavKey = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/workflows")) return "workflows";
    if (path.startsWith("/datapoints")) return "datapoints";
    if (path.startsWith("/data")) return "data";
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

        // Load real notifications from recent executions
        getActivity(15)
          .then((stats) => {
            if (!active) return;
            let readList: string[] = [];
            try {
              const stored = localStorage.getItem("orqiva_read_notifs");
              if (stored) readList = JSON.parse(stored);
            } catch {
              // Ignore storage read errors in restricted browsing contexts.
            }

            const realNotifs: NotificationItem[] = [];

            for (const exec of stats.executions) {
              if (exec.status === "failed") {
                const id = `exec-fail-${exec.id}`;
                realNotifs.push({
                  id,
                  type: "workflow.error",
                  title: "Workflow failed",
                  description: `${exec.workflow_name || "Workflow"} #${exec.workflow_id}: ${exec.error || "Execution failed"}`,
                  timestamp: exec.started_at || new Date().toISOString(),
                  read: readList.includes(id),
                  url: `/activity/${exec.workflow_id}/${exec.id}`,
                });
              } else if (exec.session_status === "human" || exec.status === "escalated") {
                const id = `exec-esc-${exec.id}`;
                realNotifs.push({
                  id,
                  type: "message.received",
                  title: "Human Escalation",
                  description: `Session ${exec.contact_name || "Customer"} requires agent response`,
                  timestamp: exec.started_at || new Date().toISOString(),
                  read: readList.includes(id),
                  url: "/inbox",
                });
              }
            }

            setNotifications(realNotifs.slice(0, 8));
          })
          .catch(() => {});
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
        return response.json();
      })
      .then((json) => {
        setHealth("online");
        if (json?.data?.queue) {
          setQueueHealth(json.data.queue);
        }
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
      <LucideProvider strokeWidth={1.5}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/widget/:token" element={<PublicWidgetWrapper />} />
          </Routes>
        </Suspense>
      </LucideProvider>
    );
  }

  if (authChecking) {
    return (
      <LucideProvider strokeWidth={1.5}>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
          <LoaderCircle className="size-7 animate-spin text-primary" />
          <p>{t("auth.checking")}</p>
        </div>
      </LucideProvider>
    );
  }

  if (!authenticated) {
    return (
      <LucideProvider strokeWidth={1.5}>
        <Login
          onLogin={(currentUser) => {
            setUser(currentUser);
            setAuthenticated(true);
          }}
        />
      </LucideProvider>
    );
  }

  return (
    <LucideProvider strokeWidth={1.5}>
      <DashboardLayout
      activeNav={activeNav}
      health={health}
      user={user}
      loggingOut={loggingOut}
      hideSidebar={location.pathname.startsWith("/workflows/")}
      onLogout={() => void handleLogout()}
      onDashboardClick={() => navigate("/dashboard")}
      onWorkflowsClick={() => navigate("/workflows")}
      onDatapointsClick={() => navigate("/datapoints")}
      onDataClick={() => navigate("/data")}
      onInboxClick={() => navigate("/inbox")}
      onChannelClick={() => navigate("/channel")}
      onActivityClick={() => navigate("/activity")}
      onAiProvidersClick={() => navigate("/ai-providers")}
      onHelpClick={() => navigate("/help")}
      onSettingsClick={() => navigate("/settings")}
      notifications={notifications}
      onMarkAsRead={markAsRead}
      onNotificationClick={onNotificationClick}
    >
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                health={health}
                queueHealth={queueHealth}
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
          <Route path="/datapoints" element={<Datapoints />} />
          <Route path="/data" element={<Data />} />
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
      </Suspense>
      </DashboardLayout>
    </LucideProvider>
  );
}

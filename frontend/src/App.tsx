
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import Login from "./Login";
import { getCurrentUser, logout } from "./services/auth";
import DashboardLayout from "./components/layout/DashboardLayout";
import Workflows from "./pages/Workflows";
import WorkflowEditor from "./pages/WorkflowEditor";
import WorkflowChat from "./pages/WorkflowChat";
import "./App.css";

type Health = "checking" | "online" | "offline";

export default function App() {
  const [health, setHealth] = useState<Health>("checking");
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

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
    } catch {
      setError("Logout gagal. Silakan coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  }

  const handleActivityClick = () => {
    setError("Halaman Activity akan ditambahkan pada tahap berikutnya.");
  };

  const handleHelpClick = () => {
    setError("Halaman Help akan ditambahkan pada tahap berikutnya.");
  };

  const handleBackToWorkflows = () => {
    setEditingWorkflowId(null);
    setTestingWorkflowId(null);
    setError("");
    const url = new URL(window.location.href);
    url.searchParams.delete("testWorkflow");
    window.history.replaceState({}, "", url);
  };

  if (authChecking) {
    return (
      <div className="auth-loading">
        <LoaderCircle size={28} className="spin" />
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
    onActivityClick: handleActivityClick,
    onHelpClick: handleHelpClick,
  };

  // Halaman editor workflow
  if (editingWorkflowId !== null) {
    return (
      <DashboardLayout
        title="Workflow editor"
        {...layoutProps}
      >
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError("")}>Tutup</button>
          </div>
        )}

        <WorkflowEditor
          workflowId={editingWorkflowId}
          onBack={handleBackToWorkflows}
        />
      </DashboardLayout>
    );
  }

  // Halaman Chat Widget untuk menguji workflow
  if (testingWorkflowId !== null) {
    return (
      <DashboardLayout
        title="Test Chat Widget"
        {...layoutProps}
      >
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError("")}>Tutup</button>
          </div>
        )}

        <WorkflowChat
          workflowId={testingWorkflowId}
          onBack={handleBackToWorkflows}
        />
      </DashboardLayout>
    );
  }

  // Halaman daftar workflow
  return (
    <DashboardLayout
      title="Workflows"
      {...layoutProps}
    >
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => setError("")}>Tutup</button>
        </div>
      )}

      <Workflows
        onOpenWorkflow={(workflowId) => {
          setError("");
          setTestingWorkflowId(null);
          setEditingWorkflowId(workflowId);
        }}
        onTestWorkflow={(workflowId) => {
          const testUrl = new URL(window.location.href);
          testUrl.searchParams.set("testWorkflow", workflowId);
          window.open(testUrl.toString(), "_blank", "noopener,noreferrer");
        }}
      />
    </DashboardLayout>
  );
}

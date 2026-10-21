import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PreferencesProvider } from "@/lib/i18n";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreferencesProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </PreferencesProvider>
  </StrictMode>,
);

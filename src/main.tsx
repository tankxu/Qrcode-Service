import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { router } from "./router";
import "./i18n";
import "./index.css";
import { RootEffects } from "@/src/components/RootEffects";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootEffects />
    <Toaster position="top-center" richColors />
    <RouterProvider router={router} />
  </StrictMode>,
);

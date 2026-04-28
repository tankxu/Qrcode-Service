import { createBrowserRouter } from "react-router";
import AppLayout from "@/src/layouts/AppLayout";
import Login from "@/src/pages/Login";
import NotFound from "@/src/pages/NotFound";
import Dashboard from "@/src/pages/app/Dashboard";
import Account from "@/src/pages/app/Account";
import NewQrWizard from "@/src/pages/app/NewQrWizard";
import QrDetail from "@/src/pages/app/QrDetail";
import StaticQrTool from "@/src/pages/tools/StaticQrTool";
import RequireAuth from "@/src/components/RequireAuth";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "new", element: <NewQrWizard /> },
      // Owner-side QR detail. Singular `/qr/:id` because `/q/:slug` is
      // reserved for the public Worker-SSR scan landing page.
      { path: "qr/:id", element: <QrDetail /> },
      { path: "account", element: <Account /> },
      { path: "tools/static-qr", element: <StaticQrTool /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

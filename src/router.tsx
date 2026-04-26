import { createBrowserRouter } from "react-router";
import MarketingLayout from "@/src/layouts/MarketingLayout";
import AppLayout from "@/src/layouts/AppLayout";
import Marketing from "@/src/pages/Marketing";
import Login from "@/src/pages/Login";
import NotFound from "@/src/pages/NotFound";
import Dashboard from "@/src/pages/app/Dashboard";
import Account from "@/src/pages/app/Account";
import StaticQrTool from "@/src/pages/tools/StaticQrTool";
import RequireAuth from "@/src/components/RequireAuth";

export const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: "/", element: <Marketing /> },
    ],
  },
  { path: "/login", element: <Login /> },
  {
    path: "/app",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "account", element: <Account /> },
      { path: "tools/static-qr", element: <StaticQrTool /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

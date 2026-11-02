import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, type ComponentType } from "react";
import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { LandingPage } from "@/pages/LandingPage";

// Cada pantalla, salvo la landing (la entrada más común), va en su propio trozo y se descarga al visitarla.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const ApplicantsPage = page(() => import("@/pages/ApplicantsPage"), "ApplicantsPage");
const LoginPage = page(() => import("@/pages/LoginPage"), "LoginPage");
const MyApplicationsPage = page(() => import("@/pages/MyApplicationsPage"), "MyApplicationsPage");
const MyPositionsPage = page(() => import("@/pages/MyPositionsPage"), "MyPositionsPage");
const NewPositionPage = page(() => import("@/pages/NewPositionPage"), "NewPositionPage");
const PositionDetailPage = page(() => import("@/pages/PositionDetailPage"), "PositionDetailPage");
const PositionsPage = page(() => import("@/pages/PositionsPage"), "PositionsPage");
const RegisterPage = page(() => import("@/pages/RegisterPage"), "RegisterPage");

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/positions", element: <PositionsPage /> },
      { path: "/positions/:id", element: <PositionDetailPage /> },
      { path: "/me/applications", element: <RequireAuth role="CANDIDATE"><MyApplicationsPage /></RequireAuth> },
      { path: "/company/positions", element: <RequireAuth role="COMPANY"><MyPositionsPage /></RequireAuth> },
      { path: "/company/positions/new", element: <RequireAuth role="COMPANY"><NewPositionPage /></RequireAuth> },
      { path: "/company/positions/:id/applicants", element: <RequireAuth role="COMPANY"><ApplicantsPage /></RequireAuth> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "*", element: <p>Página no encontrada</p> },
    ],
  },
];

// 60 s sin repetir peticiones a los mismos datos, y sin refetch solo por volver a enfocar la pestaña.
// Lo que cambia por una acción del usuario se invalida explícitamente (crear, cerrar, aplicar).
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } });
const router = createBrowserRouter(routes);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

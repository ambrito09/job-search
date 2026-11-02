import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { PositionDetailPage } from "@/pages/PositionDetailPage";
import { PositionsPage } from "@/pages/PositionsPage";
import { RegisterPage } from "@/pages/RegisterPage";

// Las pantallas se añaden como hijas de Layout en T11 a T15.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: <h1 className="text-3xl font-bold">Encuentra tu rumbo profesional</h1> },
      { path: "/positions", element: <PositionsPage /> },
      { path: "/positions/:id", element: <PositionDetailPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "*", element: <p>Página no encontrada</p> },
    ],
  },
];

const queryClient = new QueryClient();
const router = createBrowserRouter(routes);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

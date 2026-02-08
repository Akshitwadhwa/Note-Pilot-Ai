import { createBrowserRouter } from "react-router-dom";

import { AuthPage } from "../pages/AuthPage";
import { DashboardPage } from "../pages/DashboardPage";
import { TimetablePage } from "../pages/TimetablePage";
import { NotesPage } from "../pages/NotesPage";
import { AuthenticatedLayout } from "../components/layout/AuthenticatedLayout";

export const router = createBrowserRouter([
  { path: "/auth", element: <AuthPage /> },
  {
    path: "/",
    element: <AuthenticatedLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "timetable", element: <TimetablePage /> },
      { path: "notes", element: <NotesPage /> }
    ]
  }
]);

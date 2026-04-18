import { createBrowserRouter } from "react-router-dom";

import { AuthPage } from "../pages/AuthPage";
import { LogoutSplashPage } from "../pages/LogoutSplashPage";
import { DashboardPage } from "../pages/DashboardPage";
import { TimetablePage } from "../pages/TimetablePage";
import { CoursesPage } from "../pages/CoursesPage";
import { CourseDetailPage } from "../pages/CourseDetailPage";
import { MaterialDetailPage } from "../pages/MaterialDetailPage";
import { MaterialsPage } from "../pages/MaterialsPage";
import { NotesPage } from "../pages/NotesPage";
import { PastNotesPage } from "../pages/PastNotesPage";
import { QuizPrepPage } from "../pages/QuizPrepPage";
import { AuthenticatedLayout } from "../components/layout/AuthenticatedLayout";

export const router = createBrowserRouter([
  { path: "/auth", element: <AuthPage /> },
  { path: "/logout", element: <LogoutSplashPage /> },
  {
    path: "/",
    element: <AuthenticatedLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "timetable", element: <TimetablePage /> },
      { path: "materials", element: <MaterialsPage /> },
      { path: "materials/:materialId", element: <MaterialDetailPage /> },
      { path: "quiz-prep", element: <QuizPrepPage /> },
      { path: "courses", element: <CoursesPage /> },
      { path: "courses/:courseId", element: <CourseDetailPage /> },
      { path: "notes", element: <NotesPage /> },
      { path: "past-notes", element: <PastNotesPage /> }
    ]
  }
]);

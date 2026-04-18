import { useEffect, useState } from "react";
import { Outlet, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  FolderKanban,
  NotebookTabs,
  FileText,
  History,
  LogOut,
  Menu,
  X,
  Sun,
  Moon
} from "lucide-react";
import clsx from "clsx";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatted = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const day = time.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  return (
    <div className="text-right">
      <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
        {formatted}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{day}</p>
    </div>
  );
}

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/materials", label: "Materials", icon: FolderKanban },
  { to: "/quiz-prep", label: "Quiz Prep", icon: NotebookTabs },
  { to: "/courses", label: "Courses", icon: GraduationCap },
  { to: "/notes", label: "Notes", icon: FileText },
  { to: "/past-notes", label: "Past Notes", icon: History }
];

export function AuthenticatedLayout() {
  const { userReady, userEmail, signOut, authReady } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Checking session...</p>
      </div>
    );
  }

  if (!userReady) {
    return <Navigate to={loggingOut ? "/logout" : "/auth"} replace />;
  }
  const initial = userEmail?.charAt(0).toUpperCase() ?? "U";

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex h-screen bg-transparent">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-sm dark:bg-black/55 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[color:var(--app-border)] bg-[color:var(--app-surface)]/95 backdrop-blur-xl dark:border-[color:var(--app-border)] dark:bg-slate-900/88",
          "transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-[color:var(--app-border)] px-6 py-6 dark:border-[color:var(--app-border)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-slate-800 text-sm font-bold text-white shadow-[0_18px_30px_-20px_rgba(22,63,60,0.8)]">
            AT
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.08em] text-slate-900 dark:text-slate-100">
              ACADEMIC TIMETABLE
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Planner and notes</p>
          </div>
          <button
            className="ml-auto rounded-xl p-2 text-slate-400 hover:bg-stone-100 hover:text-slate-700 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1.5 px-4 py-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-50 text-teal-900 shadow-sm dark:bg-teal-950/40 dark:text-teal-100"
                    : "text-slate-600 hover:bg-stone-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/90 dark:hover:text-slate-100"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-[color:var(--app-border)] p-5 dark:border-[color:var(--app-border)]">
          {userReady && userEmail ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-sm font-bold text-teal-900 dark:bg-teal-950/60 dark:text-teal-100">
                {initial}
              </div>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {userEmail}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Student</p>
              </div>
              <button
                onClick={() => void handleSignOut()}
                disabled={loggingOut}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-rose-950/70 dark:hover:text-rose-300"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">Not signed in</p>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[color:var(--app-border)] bg-[color:var(--app-surface)]/82 px-5 py-4 backdrop-blur-xl dark:border-[color:var(--app-border)] dark:bg-slate-950/68">
          <button
            className="rounded-xl p-2 text-slate-600 hover:bg-stone-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-2xl border border-[color:var(--app-border)] bg-white/55 p-2 text-slate-600 transition-colors hover:bg-stone-100 dark:border-[color:var(--app-border)] dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <LiveClock />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

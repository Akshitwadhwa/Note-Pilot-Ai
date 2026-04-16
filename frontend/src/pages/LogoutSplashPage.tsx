import { useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, GraduationCap } from "lucide-react";

import { useAuth } from "../context/AuthContext";

const REDIRECT_DELAY_MS = 2200;

export function LogoutSplashPage() {
  const navigate = useNavigate();
  const { userReady, authReady } = useAuth();

  useEffect(() => {
    if (!authReady || userReady) return;

    const timer = window.setTimeout(() => {
      navigate("/auth", { replace: true });
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [authReady, navigate, userReady]);

  if (authReady && userReady) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[18rem] -right-[20rem] h-[40rem] w-[40rem] rounded-full bg-teal-100 blur-3xl dark:bg-teal-950/30"
          aria-hidden
        />
        <div
          className="absolute -bottom-[20rem] -left-[18rem] h-[44rem] w-[44rem] rounded-full bg-amber-100 blur-3xl dark:bg-amber-950/15"
          aria-hidden
        />
      </div>

      <section className="relative w-full max-w-lg rounded-[2rem] border border-stone-200/90 bg-white/88 p-8 text-center shadow-[0_28px_60px_-36px_rgba(15,23,42,0.42)] backdrop-blur-xl animate-fade-in-up dark:border-slate-800/80 dark:bg-slate-900/84 dark:shadow-black/35">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-slate-900 text-white shadow-[0_22px_36px_-28px_rgba(15,23,42,0.85)] dark:bg-teal-900 dark:text-teal-50">
          <GraduationCap className="h-8 w-8" />
        </div>

        <div className="mb-6 flex items-center justify-center gap-2 text-emerald-700 animate-fade-in dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold">You are signed out</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">See you soon</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Your session has ended safely. Redirecting you to the sign-in page in a moment.
        </p>

        <div className="mt-8 mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-teal-700 to-amber-500 dark:from-teal-400 dark:to-amber-400"
            style={{ animation: `shimmer ${REDIRECT_DELAY_MS}ms linear both` }}
          />
        </div>

        <Link
          to="/auth"
          replace
          className="mt-7 inline-flex items-center rounded-2xl border border-stone-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-stone-400 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          Go to login now
        </Link>
      </section>
    </div>
  );
}

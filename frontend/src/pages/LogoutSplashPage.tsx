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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[18rem] -right-[20rem] h-[40rem] w-[40rem] rounded-full bg-sky-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-[20rem] -left-[18rem] h-[44rem] w-[44rem] rounded-full bg-violet-600/20 blur-3xl"
          aria-hidden
        />
      </div>

      <section className="relative w-full max-w-lg rounded-3xl border border-slate-800/80 bg-slate-900/65 p-8 text-center shadow-2xl shadow-sky-900/30 backdrop-blur-xl animate-fade-in-up">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-lg shadow-sky-700/30">
          <GraduationCap className="h-8 w-8" />
        </div>

        <div className="mb-6 flex items-center justify-center gap-2 text-emerald-300 animate-fade-in">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold">You are signed out</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">See you soon</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Your session has ended safely. Redirecting you to the sign-in page in a moment.
        </p>

        <div className="mt-8 mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-violet-500"
            style={{ animation: `shimmer ${REDIRECT_DELAY_MS}ms linear both` }}
          />
        </div>

        <Link
          to="/auth"
          replace
          className="mt-7 inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
        >
          Go to login now
        </Link>
      </section>
    </div>
  );
}

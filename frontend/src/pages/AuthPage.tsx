import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { GraduationCap, Sparkles, Clock, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { supabaseConfigError } from "../lib/supabase";

export function AuthPage() {
  const { userReady, authReady, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  if (authReady && userReady) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setAuthError("");

    try {
      if (isSignUp) {
        await signUp({ email: email.trim(), password, name: name.trim() });
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (error) {
      setAuthError((error as Error).message || (isSignUp ? "Sign up failed" : "Sign in failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/70 to-transparent dark:from-slate-900/30" />
        <div className="absolute -top-28 left-[-8rem] h-80 w-80 rounded-full bg-teal-100/70 blur-3xl dark:bg-teal-950/35" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-96 w-96 rounded-full bg-amber-100/80 blur-3xl dark:bg-amber-950/15" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#475569_1px,transparent_1px),linear-gradient(to_bottom,#475569_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-12 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden animate-fade-in-up flex-col space-y-10 lg:flex">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400" />
              Academic Planner
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-slate-900 text-white shadow-[0_24px_40px_-28px_rgba(15,23,42,0.8)] dark:bg-teal-900 dark:text-teal-50">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Timetable Workspace
                </p>
                <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Plan classes, keep notes, stay prepared.
                </h1>
              </div>
            </div>
          </div>

          <p className="max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            A calmer space for your weekly schedule and lecture notes. Built for everyday academic work, without the usual glossy startup styling.
          </p>

          <div className="grid gap-4 pt-2">
            <FeatureItem
              icon={<Clock className="h-5 w-5 text-teal-700 dark:text-teal-300" />}
              title="Weekly structure"
              description="Keep every lecture block, free period, and subject in one dependable schedule."
            />
            <FeatureItem
              icon={<Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-300" />}
              title="Clear note summaries"
              description="Turn rough class notes into concise recaps when you need to review quickly."
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div
            className="relative overflow-hidden rounded-[2rem] border border-stone-200/90 bg-white/88 p-8 shadow-[0_28px_60px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl animate-fade-in-up dark:border-slate-800/80 dark:bg-slate-900/88 dark:shadow-black/40"
            style={{ animationDelay: "100ms" }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-teal-500 to-amber-500 dark:from-teal-400 dark:via-brand-500 dark:to-amber-400" />

            <div className="mb-8 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Welcome
              </p>
              <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
                {isSignUp ? "Create an account" : "Welcome back"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isSignUp
                  ? "Set up your account to start organizing classes and notes."
                  : "Sign in to open your dashboard and weekly planner."}
              </p>
            </div>

            {supabaseConfigError && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {supabaseConfigError}. Create <code>frontend/.env</code> from <code>.env.example</code>.
              </div>
            )}

            {authError && (
              <div className="mb-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                <span className="block mt-0.5">•</span>
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div
                className={`space-y-1.5 overflow-hidden transition-all duration-300 ${isSignUp ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <label className="ml-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-700 dark:group-focus-within:text-teal-300" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isSignUp}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-stone-400 transition-all focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-700/10 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-400/40 dark:focus:bg-slate-800 dark:focus:ring-teal-400/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-700 dark:group-focus-within:text-teal-300" />
                  <input
                    type="email"
                    placeholder="you@university.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-stone-400 transition-all focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-700/10 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-400/40 dark:focus:bg-slate-800 dark:focus:ring-teal-400/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-700 dark:group-focus-within:text-teal-300" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/80 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-stone-400 transition-all focus:border-teal-700/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-700/10 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-400/40 dark:focus:bg-slate-800 dark:focus:ring-teal-400/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_40px_-28px_rgba(15,23,42,0.9)] transition-all duration-300 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-teal-700 dark:hover:bg-teal-600"
              >
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? "Create Account" : "Sign In"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError("");
                  }}
                  className="font-medium text-teal-800 transition-colors hover:text-teal-700 focus:outline-none focus:underline dark:text-teal-300 dark:hover:text-teal-200"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 rounded-[1.5rem] border border-stone-200 bg-white/82 p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-all hover:border-stone-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/72 dark:hover:border-slate-700 dark:hover:bg-slate-900/90">
      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 dark:border-slate-700 dark:bg-slate-800">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

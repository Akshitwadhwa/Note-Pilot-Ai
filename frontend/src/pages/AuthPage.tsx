import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { GraduationCap, Sparkles, Clock, Mail, Lock } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { supabaseConfigError } from "../lib/supabase";

export function AuthPage() {
  const { userReady, authReady, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  if (authReady && userReady) {
    return <Navigate to="/" replace />;
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      await signIn({ email: email.trim(), password });
    } catch (error) {
      setAuthError((error as Error).message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setLoading(true);
    setAuthError("");
    try {
      await signUp({ email: email.trim(), password });
    } catch (error) {
      setAuthError((error as Error).message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center bg-gradient-to-br from-sky-600 via-brand-700 to-brand-900 p-12 text-white">
        <div className="max-w-md space-y-8 animate-fade-in-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold leading-tight">AI Smart Timetable</h1>
          <p className="text-lg text-white/80">
            Manage your class schedule, take notes, and get AI-powered summaries to boost your learning.
          </p>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Clock className="h-5 w-5 text-white/50" />
              <span>Automatic class detection based on your schedule</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <Sparkles className="h-5 w-5 text-white/50" />
              <span>AI-powered note summarization</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8 animate-fade-in-up">
          {/* Mobile branding */}
          <div className="text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-brand-700 text-lg font-bold text-white shadow-lg">
              AI
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              AI Smart Timetable
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sign in to manage your classes and notes
            </p>
          </div>

          {/* Desktop title */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          {supabaseConfigError && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {supabaseConfigError}. Create <code>frontend/.env</code> from <code>.env.example</code>.
            </p>
          )}

          <form className="space-y-4" onSubmit={handleSignIn}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                />
              </div>
            </div>

            {authError && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {authError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-sky-500 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400"
              >
                {loading ? "Please wait..." : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => void handleSignUp()}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 font-sans text-slate-100 selection:bg-sky-500/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -right-[25%] h-[1000px] w-[1000px] rounded-full bg-sky-500/10 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-[25%] -left-[25%] h-[1000px] w-[1000px] rounded-full bg-violet-600/10 blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-brand-500/5 blur-3xl" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl px-4 py-8 grid lg:grid-cols-2 gap-12 items-center">

        {/* Left Side: Branding & Features */}
        <div className="hidden lg:flex flex-col space-y-8 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-sky-500/20">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              AI Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-400">Timetable</span>
            </h1>
          </div>

          <p className="text-lg text-slate-400 max-w-md leading-relaxed">
            Your intelligent companion for academic success. Manage classes, summarize notes, and stay organized with AI.
          </p>

          <div className="space-y-6 pt-4">
            <FeatureItem
              icon={<Clock className="h-5 w-5 text-sky-400" />}
              title="Smart Scheduling"
              description="Automatic class detection based on your routine."
            />
            <FeatureItem
              icon={<Sparkles className="h-5 w-5 text-violet-400" />}
              title="AI Summaries"
              description="Turn messy notes into concise, actionable summaries."
            />
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full max-w-md mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl p-8 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}>

            {/* Ambient Card Glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-50" />

            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isSignUp ? "Create an account" : "Welcome back"}
              </h2>
              <p className="text-sm text-slate-400">
                {isSignUp ? "Start your journey to better grades today." : "Enter your details to access your dashboard."}
              </p>
            </div>

            {supabaseConfigError && (
              <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-200">
                {supabaseConfigError}. Create <code>frontend/.env</code> from <code>.env.example</code>.
              </div>
            )}

            {authError && (
              <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-200 flex items-start gap-2">
                <span className="block mt-0.5">•</span>
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Name Field (Sign Up Only) */}
              <div className={`space-y-1.5 transition-all duration-300 overflow-hidden ${isSignUp ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                <label className="text-xs font-medium text-slate-300 ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-sky-400" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isSignUp}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/50 focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-sky-400" />
                  <input
                    type="email"
                    placeholder="you@university.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/50 focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-sky-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/50 focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 p-[1px] shadow-xl shadow-sky-500/20 transition-all duration-300 hover:shadow-sky-500/40 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <div className="relative flex items-center justify-center gap-2 rounded-[11px] bg-slate-950/50 px-4 py-3 text-sm font-bold text-white transition-all group-hover:bg-transparent">
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
              <p className="text-sm text-slate-400">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError("");
                  }}
                  className="font-medium text-sky-400 hover:text-sky-300 transition-colors focus:outline-none focus:underline"
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
    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/30 border border-white/5 backdrop-blur-sm transition-all hover:bg-slate-800/30 hover:border-white/10">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

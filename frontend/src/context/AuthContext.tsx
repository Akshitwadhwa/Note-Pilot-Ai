import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseConfigError } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  authReady: boolean;
  userReady: boolean;
  userEmail: string | undefined;
  userId: string;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signUp: (payload: { email: string; password: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setAuthReady(true);
      return;
    }

    let mounted = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
      })
      .finally(() => {
        if (!mounted) return;
        setAuthReady(true);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void queryClient.invalidateQueries();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  async function signIn({ email, password }: { email: string; password: string }) {
    if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp({ email, password, name }: { email: string; password: string; name?: string }) {
    if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) throw new Error(supabaseConfigError ?? "Supabase is not configured");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const userReady = Boolean(session?.user?.id);

  return (
    <AuthContext.Provider
      value={{
        session,
        authReady,
        userReady,
        userEmail: session?.user?.email,
        userId: session?.user?.id ?? "anonymous",
        signIn,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

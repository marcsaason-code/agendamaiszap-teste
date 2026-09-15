import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  business_name: string;
  segment: string;
  slug: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export type SubscriptionStatus = "trial" | "active" | "expired";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  subscriptionStatus: SubscriptionStatus;
  trialDaysRemaining: number;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  subscriptionStatus: "trial",
  trialDaysRemaining: 3,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("trial");
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(3);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data);
  };

  const fetchSubscription = useCallback(async (userId: string) => {
    // Check subscription record (status maintained by Stripe webhook)
    const { data } = await supabase
      .from("subscriptions")
      .select("status, trial_start")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.status === "active") {
      setSubscriptionStatus("active");
      setTrialDaysRemaining(0);
      return;
    }

    if (data?.status === "trial" && data.trial_start) {
      const elapsed = Math.floor((Date.now() - new Date(data.trial_start).getTime()) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, 3 - elapsed);
      setTrialDaysRemaining(remaining);
      setSubscriptionStatus(elapsed >= 3 ? "expired" : "trial");
      return;
    }

    // Segurança: ausência de registro, status inesperado ou assinatura vencida
    // nunca concede um novo trial automaticamente. Falha de forma fechada.
    setTrialDaysRemaining(0);
    setSubscriptionStatus("expired");
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchSubscription(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setSubscriptionStatus("trial");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchSubscription(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchSubscription]);

  // Auto-refresh subscription every 60s
  useEffect(() => {
    if (!session?.user) return;
    const interval = setInterval(() => fetchSubscription(session.user.id), 60000);
    return () => clearInterval(interval);
  }, [session, fetchSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setSubscriptionStatus("trial");
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const refreshSubscription = async () => {
    if (session?.user) await fetchSubscription(session.user.id);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      subscriptionStatus,
      trialDaysRemaining,
      signOut,
      refreshProfile,
      refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

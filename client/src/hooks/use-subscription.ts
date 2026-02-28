// Hook for managing user subscription status and features
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type SubscriptionPlan = "free" | "basic" | "pro" | "premium";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "inactive";

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: string | null;
  startedAt: string | null;
  isActive: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface PlanPrice {
  id: string;
  unitAmount: number;
  currency: string;
  recurring: { interval: string } | null;
  metadata: Record<string, string>;
}

export interface SubscriptionPlanInfo {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
  prices: PlanPrice[];
}

// Feature limits per plan
// Basic: RSI indicator, 3 predictions/day
// Pro: RSI/MACD/SMA indicators, 10 predictions/day, trading signals, weekly alerts
// Premium: All indicators, unlimited predictions, priority signals, premium AI reports, real-time email alerts
export const PLAN_FEATURES = {
  free: {
    predictions: 0,
    indicators: [] as readonly string[],
    signals: false,
    analysis: false,
    alerts: false,
    alertFrequency: null as "weekly" | "realtime" | null,
  },
  basic: {
    predictions: 3,
    indicators: ["rsi"] as readonly string[],
    signals: false,
    analysis: false,
    alerts: false,
    alertFrequency: null as "weekly" | "realtime" | null,
  },
  pro: {
    predictions: 10,
    indicators: ["rsi", "macd", "sma"] as readonly string[],
    signals: true,
    analysis: false,
    alerts: true,
    alertFrequency: "weekly" as "weekly" | "realtime" | null,
  },
  premium: {
    predictions: Infinity,
    indicators: ["rsi", "macd", "sma", "ema", "bollinger", "stochastic", "williams", "cci", "pivot", "ai"] as readonly string[],
    signals: true,
    analysis: true,
    alerts: true,
    alertFrequency: "realtime" as "weekly" | "realtime" | null,
  },
} as const;

export function useSubscription() {
  const { data: subscription, isLoading, error } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription/status"],
    retry: false,
  });

  const plan = subscription?.plan || "free";
  const isActive = subscription?.isActive || false;
  const features = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free;

  // Check if a feature is available for the current plan
  const hasFeature = (feature: keyof typeof PLAN_FEATURES.premium) => {
    if (!isActive && plan !== "free") return false;
    const planFeatures = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES];
    if (!planFeatures) return false;
    
    const value = planFeatures[feature];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  };

  // Check if a specific indicator is available
  const hasIndicator = (indicator: string) => {
    if (!isActive && plan !== "free") return false;
    return (features.indicators as readonly string[]).includes(indicator);
  };

  // Check remaining predictions for today
  const canMakePrediction = (usedToday: number) => {
    if (!isActive && plan !== "free") return false;
    return usedToday < features.predictions;
  };

  return {
    subscription,
    plan,
    isActive,
    isLoading,
    error,
    features,
    hasFeature,
    hasIndicator,
    canMakePrediction,
    requiresSubscription: !isActive,
  };
}

export function useSubscriptionPlans() {
  return useQuery<{ plans: SubscriptionPlanInfo[] }>({
    queryKey: ["/api/subscription/plans"],
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/subscription/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

// Create subscription with embedded payment (returns client_secret for Stripe Elements)
export function useCreateSubscription() {
  return useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/subscription/create-subscription", { priceId });
      return res.json() as Promise<{ subscriptionId: string; clientSecret: string; status: string }>;
    },
  });
}

// Combined checkout + registration (creates account and subscription in one step)
export function useCheckoutRegister() {
  return useMutation({
    mutationFn: async (data: { email: string; password: string; firstName?: string; lastName?: string; priceId: string }) => {
      const res = await apiRequest("POST", "/api/subscription/checkout-register", data);
      return res.json() as Promise<{ subscriptionId: string; clientSecret: string; status: string; userId: string; isNewUser: boolean }>;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.removeQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.removeQueries({ queryKey: ["/api/predictions/usage"] });
    },
  });
}

// Confirm subscription after successful payment
export function useConfirmSubscription() {
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await apiRequest("POST", "/api/subscription/confirm", { subscriptionId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.removeQueries({ queryKey: ["/api/predictions/usage"] });
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

// Fetch Stripe publishable key
export function useStripePublishableKey() {
  return useQuery<{ publishableKey: string }>({
    queryKey: ["/api/stripe/publishable-key"],
  });
}

export function useCustomerPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

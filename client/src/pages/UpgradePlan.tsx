import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription, useSubscriptionPlans, type SubscriptionPlanInfo } from "@/hooks/use-subscription";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Loader2,
  Crown,
  Zap,
  TrendingUp,
  LineChart,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const PLAN_DISPLAY: Record<string, {
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  highlights: string[];
  popular?: boolean;
}> = {
  basic: {
    name: "Basic",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    description: "Essential gold market analysis for beginners",
    highlights: [
      "Real-time XAU/USD price tracking",
      "Basic price chart with zoom controls",
      "RSI technical indicator",
      "3 AI analyses per day",
    ],
  },
  pro: {
    name: "Pro",
    icon: Zap,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    description: "Advanced tools for serious traders",
    highlights: [
      "Everything in Basic, plus:",
      "MACD and SMA indicators",
      "10 AI analyses per day",
      "Unlimited trading signals",
      "Weekly market analysis reports",
    ],
    popular: true,
  },
  premium: {
    name: "Premium",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "Complete suite for professional traders",
    highlights: [
      "Everything in Pro, plus:",
      "All technical indicators",
      "Unlimited AI analyses",
      "Priority trading signals",
      "Premium AI market reports",
      "Real-time email alerts",
    ],
  },
};

const PLAN_ORDER: Record<string, number> = { basic: 0, pro: 1, premium: 2 };

function isUpgrade(fromPlan: string, toPlan: string): boolean {
  return (PLAN_ORDER[toPlan] ?? 0) > (PLAN_ORDER[fromPlan] ?? 0);
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function UpgradePlan() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { plan: currentPlan, subscription, isLoading: subLoading } = useSubscription();
  const { data: plansData, isLoading: plansLoading } = useSubscriptionPlans();
  const { toast } = useToast();
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  const changePlanMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/subscription/change-plan", { priceId });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to change plan");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.removeQueries({ queryKey: ["/api/predictions/usage"] });
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      
      if (data.type === 'downgrade') {
        const effectiveDate = data.effectiveDate 
          ? new Date(data.effectiveDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'the end of your current billing period';
        toast({
          title: "Downgrade Scheduled",
          description: `Your plan will change to ${data.newPlan.charAt(0).toUpperCase() + data.newPlan.slice(1)} on ${effectiveDate}. You'll keep your current plan features until then.`,
        });
        setChangingPlan(null);
        setTimeout(() => setLocation("/dashboard"), 2500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Plan Change Failed",
        description: error.message,
        variant: "destructive",
      });
      setChangingPlan(null);
    },
  });

  const handleChangePlan = (planKey: string, priceId: string) => {
    if (planKey === currentPlan) return;
    
    if (isUpgrade(currentPlan || 'free', planKey)) {
      setLocation(`/checkout?plan=${planKey}&upgrade=true`);
      return;
    }
    
    setChangingPlan(planKey);
    changePlanMutation.mutate(priceId);
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const plans = plansData?.plans?.sort((a: SubscriptionPlanInfo, b: SubscriptionPlanInfo) => {
    const priceA = a.prices[0]?.unitAmount || 0;
    const priceB = b.prices[0]?.unitAmount || 0;
    return priceA - priceB;
  }) || [];

  const hasActiveSubscription = subscription?.isActive && subscription?.stripeSubscriptionId;

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <LineChart className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 tracking-tight">
                Gold Predict
              </h1>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-10 space-y-3">
          <h2 className="text-3xl font-display font-bold text-foreground">
            {hasActiveSubscription ? "Change Your Plan" : "Choose a Plan"}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {hasActiveSubscription ? (
              <>Logged in as <strong className="text-foreground">{user.email}</strong>. Select a new plan below to upgrade or downgrade instantly.</>
            ) : (
              <>Select a plan to get started with Gold Predict.</>
            )}
          </p>
          {currentPlan && currentPlan !== "free" && (
            <Badge variant="outline" className="text-primary border-primary/30">
              Current plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </Badge>
          )}
        </div>

        {plansLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan: SubscriptionPlanInfo) => {
              const planKey = plan.metadata?.plan || "basic";
              const display = PLAN_DISPLAY[planKey];
              if (!display) return null;

              const price = plan.prices[0];
              const isCurrentPlan = planKey === currentPlan;
              const Icon = display.icon;
              const isChanging = changingPlan === planKey;

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col ${
                    display.popular ? "border-primary/50 shadow-lg shadow-primary/10" : "border-white/10"
                  } ${isCurrentPlan ? "ring-2 ring-primary/50" : ""}`}
                  data-testid={`card-plan-${planKey}`}
                >
                  {display.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="secondary" className="px-3 py-1">
                        Current
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <div className={`w-14 h-14 rounded-2xl ${display.bgColor} flex items-center justify-center mx-auto mb-3`}>
                      <Icon className={`w-7 h-7 ${display.color}`} />
                    </div>
                    <CardTitle className="text-xl font-display">{display.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{display.description}</p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {price && (
                      <div className="text-center mb-6">
                        <span className="text-4xl font-bold font-display">
                          {formatPrice(price.unitAmount, price.currency)}
                        </span>
                        <span className="text-muted-foreground text-sm">/month</span>
                      </div>
                    )}
                    <ul className="space-y-3">
                      {display.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${display.color}`} />
                          <span className="text-muted-foreground">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-4">
                    {hasActiveSubscription ? (
                      <Button
                        className="w-full"
                        variant={isCurrentPlan ? "outline" : display.popular ? "default" : "secondary"}
                        disabled={isCurrentPlan || changePlanMutation.isPending}
                        onClick={() => price && handleChangePlan(planKey, price.id)}
                        data-testid={`button-select-plan-${planKey}`}
                      >
                        {isChanging ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Changing...
                          </>
                        ) : isCurrentPlan ? (
                          "Current Plan"
                        ) : isUpgrade(currentPlan || 'free', planKey) ? (
                          <>
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Upgrade to {display.name}
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-4 h-4 mr-2" />
                            Downgrade to {display.name}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={display.popular ? "default" : "secondary"}
                        onClick={() => setLocation(`/checkout?plan=${planKey}`)}
                        data-testid={`button-subscribe-plan-${planKey}`}
                      >
                        Get Started
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center mt-8 text-sm text-muted-foreground space-y-1">
          <p>Upgrades are prorated — you only pay the difference for the remaining days.</p>
          <p>Downgrades take effect at the start of your next billing period.</p>
        </div>
      </main>
    </div>
  );
}

import { DashboardLayout } from "@/components/DashboardLayout";
import { useSubscription, useSubscriptionPlans, useCheckout, PLAN_FEATURES } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Crown, Zap, TrendingUp } from "lucide-react";

const PLAN_DISPLAY = {
  basic: {
    name: "Basic",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Essential gold market analysis for beginners",
    highlights: [
      "Real-time XAU/USD price tracking",
      "Basic price chart with zoom controls",
      "RSI technical indicator",
      "3 AI predictions per day",
    ],
  },
  pro: {
    name: "Pro",
    icon: Zap,
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "Advanced tools for serious traders",
    highlights: [
      "Everything in Basic, plus:",
      "MACD and SMA indicators",
      "10 AI predictions per day",
      "Full trading signals access",
      "Weekly market analysis reports",
    ],
    popular: true,
  },
  premium: {
    name: "Premium",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Complete suite for professional traders",
    highlights: [
      "Everything in Pro, plus:",
      "All technical indicators",
      "Unlimited AI predictions",
      "Priority trading signals",
      "Premium AI market reports",
      "Real-time email alerts",
    ],
  },
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function Pricing() {
  const { subscription, plan: currentPlan, isActive, isLoading: subLoading } = useSubscription();
  const { data: plansData, isLoading: plansLoading } = useSubscriptionPlans();
  const checkout = useCheckout();

  const isLoading = subLoading || plansLoading;

  const handleSubscribe = (priceId: string) => {
    checkout.mutate(priceId);
  };

  // Sort plans by price
  const plans = plansData?.plans?.sort((a, b) => {
    const priceA = a.prices[0]?.unitAmount || 0;
    const priceB = b.prices[0]?.unitAmount || 0;
    return priceA - priceB;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold mb-3">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock powerful gold market analysis tools and AI-powered predictions.
            Choose the plan that fits your trading style.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">
                Subscription plans are being set up. Please check back soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const planKey = plan.metadata?.plan as keyof typeof PLAN_DISPLAY || 'basic';
              const display = PLAN_DISPLAY[planKey] || PLAN_DISPLAY.basic;
              const price = plan.prices[0];
              const isCurrentPlan = currentPlan === planKey && isActive;
              const Icon = display.icon;

              return (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col ${display.popular ? 'border-primary shadow-lg shadow-primary/10' : 'border-white/5'}`}
                  data-testid={`card-plan-${planKey}`}
                >
                  {display.popular && (
                    <Badge 
                      className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground"
                    >
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className={`w-12 h-12 mx-auto rounded-full ${display.bgColor} flex items-center justify-center mb-3`}>
                      <Icon className={`w-6 h-6 ${display.color}`} />
                    </div>
                    <CardTitle className="text-2xl">{display.name}</CardTitle>
                    <CardDescription>{display.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-6">
                    <div className="text-center">
                      {price ? (
                        <>
                          <span className="text-4xl font-bold">
                            {formatPrice(price.unitAmount, price.currency)}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </>
                      ) : (
                        <span className="text-2xl text-muted-foreground">Price not set</span>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {display.highlights.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    {isCurrentPlan ? (
                      <Button 
                        className="w-full" 
                        variant="outline" 
                        disabled
                        data-testid={`button-current-plan-${planKey}`}
                      >
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={display.popular ? "default" : "outline"}
                        onClick={() => price && handleSubscribe(price.id)}
                        disabled={!price || checkout.isPending}
                        data-testid={`button-subscribe-${planKey}`}
                      >
                        {checkout.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {isActive ? 'Switch Plan' : 'Subscribe'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Feature Comparison */}
        <Card className="border-white/5">
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>See what's included in each plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-medium text-foreground">Feature</th>
                    <th className="text-center py-3 px-4 font-medium text-foreground">Basic</th>
                    <th className="text-center py-3 px-4 font-medium text-primary">Pro</th>
                    <th className="text-center py-3 px-4 font-medium text-amber-500">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 text-muted-foreground">Daily Predictions</td>
                    <td className="text-center py-3 px-4">3</td>
                    <td className="text-center py-3 px-4">10</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 text-muted-foreground">RSI Indicator</td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 text-muted-foreground">MACD Indicator</td>
                    <td className="text-center py-3 px-4"><X className="w-4 h-4 text-muted-foreground mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 text-muted-foreground">SMA Indicator</td>
                    <td className="text-center py-3 px-4"><X className="w-4 h-4 text-muted-foreground mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 text-muted-foreground">Trading Signals</td>
                    <td className="text-center py-3 px-4"><X className="w-4 h-4 text-muted-foreground mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 text-muted-foreground">AI Market Analysis</td>
                    <td className="text-center py-3 px-4"><X className="w-4 h-4 text-muted-foreground mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 text-muted-foreground">Real-time Email Alerts</td>
                    <td className="text-center py-3 px-4"><X className="w-4 h-4 text-muted-foreground mx-auto" /></td>
                    <td className="text-center py-3 px-4"><X className="w-4 h-4 text-muted-foreground mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* FAQ or Notice */}
        <Card className="border-white/5 bg-primary/5">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              Cancel anytime from your account settings. Subscriptions renew automatically each month.
              Payments are securely processed by Stripe. You are responsible for your own investment decisions.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

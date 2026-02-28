import { useSubscriptionPlans } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Loader2, Crown, Zap, TrendingUp, LineChart, LogIn, AlertCircle } from "lucide-react";
import { useLocation, useSearch } from "wouter";

const PLAN_DISPLAY: Record<string, { 
  name: string; 
  icon: any; 
  color: string; 
  bgColor: string; 
  description: string; 
  highlights: string[]; 
  popular?: boolean 
}> = {
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

export default function LandingPricing() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const signupRequired = params.get('signup') === 'required';
  
  const { data: plansData, isLoading: plansLoading } = useSubscriptionPlans();

  const handleSelectPlan = (planKey: string) => {
    setLocation(`/checkout?plan=${planKey}`);
  };

  const plans = plansData?.plans?.sort((a, b) => {
    const priceA = a.prices[0]?.unitAmount || 0;
    const priceB = b.prices[0]?.unitAmount || 0;
    return priceA - priceB;
  }) || [];

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/30 bloom-gold">
              <LineChart className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 tracking-tight">
                Gold Predict
              </h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 w-fit -mt-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-primary leading-none">
                  By Furlan Mattia
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1">
              <Crown className="w-3 h-3 mr-1" />
              Premium Gold Market Intelligence
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold">
              Master the Gold Market with
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-500"> AI-Powered</span> Analysis
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get real-time XAU/USD predictions, advanced technical indicators, and professional trading signals. 
              Start your journey to smarter gold trading today.
            </p>
          </div>

          {/* Signup Required Alert */}
          {signupRequired && (
            <Alert className="border-primary/30 bg-primary/5 max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                <strong>Account not found.</strong> You need to subscribe first to create your account and access Gold Predict.
              </AlertDescription>
            </Alert>
          )}

          {/* Pricing Cards */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground">Select the plan that fits your trading needs</p>
          </div>

          {plansLoading ? (
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
                const Icon = display.icon;

                return (
                  <Card 
                    key={plan.id} 
                    className={`relative flex flex-col bloom-card transition-transform duration-300 ${display.popular ? 'border-primary shadow-lg shadow-primary/10' : 'border-white/5'}`}
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
                      <Button
                        className="w-full"
                        variant={display.popular ? "default" : "outline"}
                        onClick={() => handleSelectPlan(planKey)}
                        disabled={!price}
                        data-testid={`button-subscribe-${planKey}`}
                      >
                        Get Started
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Feature Comparison */}
          <Card className="border-white/5 mt-12">
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
                      <td className="py-3 px-4 text-muted-foreground">MACD & SMA Indicators</td>
                      <td className="text-center py-3 px-4 text-muted-foreground">-</td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 px-4 text-muted-foreground">Trading Signals</td>
                      <td className="text-center py-3 px-4 text-muted-foreground">-</td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 px-4 text-muted-foreground">AI Market Analysis</td>
                      <td className="text-center py-3 px-4 text-muted-foreground">-</td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 px-4 text-muted-foreground">Real-time Email Alerts</td>
                      <td className="text-center py-3 px-4 text-muted-foreground">-</td>
                      <td className="text-center py-3 px-4 text-muted-foreground">-</td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Login Button for Existing Members */}
          <Card className="border-primary/20 bg-primary/5 mt-8">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="font-semibold text-lg text-foreground">Already a subscriber?</h3>
                  <p className="text-sm text-muted-foreground">
                    If your plan is activated, login to access your dashboard
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/login')}
                  className="min-w-[140px]"
                  data-testid="button-login-member"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-amber-500 text-lg font-bold">!</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Important Disclaimer</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong>This is not financial advice.</strong> Gold Predict provides market analysis tools and AI-powered predictions for educational and informational purposes only. 
                    We cannot guarantee the accuracy of any prediction or analysis. Markets are inherently unpredictable and anything can happen at any time. 
                    You are solely responsible for your trading decisions. Past performance is not indicative of future results. 
                    Never invest more than you can afford to lose. Please consult with a qualified financial advisor before making any investment decisions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <Card className="border-white/5 bg-card/50">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground text-center">
                Cancel anytime from your account settings. Subscriptions renew automatically each month.
                Payments are securely processed by Stripe. You are responsible for your own investment decisions.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

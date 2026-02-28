import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  useSubscriptionPlans, 
  useCheckoutRegister,
  useConfirmSubscription,
  useStripePublishableKey,
  useSubscription,
} from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CheckCircle2, Loader2, Crown, Zap, TrendingUp, ArrowLeft, CreditCard, LineChart, Shield, AlertCircle, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";

const PLAN_DISPLAY: Record<string, { 
  name: string; 
  icon: any; 
  color: string; 
  bgColor: string; 
  description: string; 
  highlights: string[]; 
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

const ELEMENT_STYLE = {
  base: {
    fontSize: '16px',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    '::placeholder': {
      color: '#9ca3af',
    },
    iconColor: '#f59e0b',
  },
  invalid: {
    color: '#ef4444',
    iconColor: '#ef4444',
  },
};

interface PaymentFormProps {
  priceId: string;
  planName: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
  existingUser: { email: string } | null;
}

function PaymentForm({ priceId, planName, amount, currency, onSuccess, existingUser }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  const [email, setEmail] = useState(existingUser?.email || "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const checkoutRegister = useCheckoutRegister();
  const confirmSubscription = useConfirmSubscription();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      return;
    }

    if (!email || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { subscriptionId, clientSecret } = await checkoutRegister.mutateAsync({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        priceId,
      });

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        await confirmSubscription.mutateAsync(subscriptionId);
        onSuccess();
      } else {
        setErrorMessage("Payment requires additional verification. Please contact support.");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      let msg = err.message || "An unexpected error occurred. Please try again.";
      try {
        const jsonMatch = msg.match(/\{.*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.error) msg = parsed.error;
        }
      } catch {}
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);

  useEffect(() => {
    setCardComplete(cardNumberComplete && cardExpiryComplete && cardCvcComplete);
  }, [cardNumberComplete, cardExpiryComplete, cardCvcComplete]);

  const isFormValid = email && password.length >= 6 && cardComplete;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Account Details</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="checkout-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              data-testid="input-checkout-email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="checkout-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              required
              minLength={6}
              data-testid="input-checkout-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              tabIndex={-1}
              data-testid="button-toggle-password"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {existingUser ? "Enter your existing password to confirm" : "This will be your login for Gold Predict"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="checkout-first-name">First Name</Label>
              <Input
                id="checkout-first-name"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid="input-checkout-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-last-name">Last Name</Label>
              <Input
                id="checkout-last-name"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                data-testid="input-checkout-last-name"
              />
            </div>
          </div>

        <div className="border-t border-border/40 pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Payment Details</span>
          </div>
        </div>

        <CardFields
          onCardNumberChange={(complete) => setCardNumberComplete(complete)}
          onCardExpiryChange={(complete) => setCardExpiryComplete(complete)}
          onCardCvcChange={(complete) => setCardCvcComplete(complete)}
          onError={(msg) => setErrorMessage(msg)}
          clearError={() => {
            if (!cardNumberComplete || !cardExpiryComplete || !cardCvcComplete) {
              setErrorMessage(null);
            }
          }}
        />

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{planName} Plan (Monthly)</span>
            <span>{formatPrice(amount, currency)}</span>
          </div>
          <div className="border-t border-border/40 pt-3 flex justify-between gap-2 font-bold">
            <span>Total Today</span>
            <span className="text-primary">{formatPrice(amount, currency)}</span>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing || !isFormValid}
        data-testid="button-confirm-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {existingUser ? `Pay ${formatPrice(amount, currency)}` : `Create Account & Pay ${formatPrice(amount, currency)}`}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your payment is securely processed by Stripe.
        You can cancel anytime from your account settings.
      </p>
    </form>
  );
}

function CardFields({ 
  onCardNumberChange, 
  onCardExpiryChange, 
  onCardCvcChange, 
  onError, 
  clearError 
}: { 
  onCardNumberChange: (complete: boolean) => void;
  onCardExpiryChange: (complete: boolean) => void;
  onCardCvcChange: (complete: boolean) => void;
  onError: (msg: string) => void;
  clearError: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="card-number">Card Number</Label>
        <div className="p-3 rounded-lg border border-border bg-background">
          <CardNumberElement
            id="card-number"
            options={{ style: ELEMENT_STYLE, showIcon: true, disableLink: true }}
            onChange={(e) => {
              onCardNumberChange(e.complete);
              if (e.error) {
                onError(e.error.message);
              } else {
                clearError();
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="card-expiry">Expiry Date</Label>
          <div className="p-3 rounded-lg border border-border bg-background">
            <CardExpiryElement
              id="card-expiry"
              options={{ style: ELEMENT_STYLE }}
              onChange={(e) => {
                onCardExpiryChange(e.complete);
                if (e.error) {
                  onError(e.error.message);
                } else {
                  clearError();
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="card-cvc">Security Code</Label>
          <div className="p-3 rounded-lg border border-border bg-background">
            <CardCvcElement
              id="card-cvc"
              options={{ style: ELEMENT_STYLE }}
              onChange={(e) => {
                onCardCvcChange(e.complete);
                if (e.error) {
                  onError(e.error.message);
                } else {
                  clearError();
                }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

const PLAN_PRICES: Record<string, number> = {
  basic: 999,
  pro: 1999,
  premium: 4999,
};

interface UpgradePaymentFormProps {
  planName: string;
  priceId: string;
  fullAmount: number;
  currency: string;
  currentPlanKey: string | null;
  onSuccess: () => void;
}

function UpgradePaymentForm({ planName, priceId, fullAmount, currency, currentPlanKey, onSuccess }: UpgradePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeData, setUpgradeData] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    currentPlanAmount: number | null;
    newPlanAmount: number | null;
    currentPlan: string | null;
  } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);

  useEffect(() => {
    setCardComplete(cardNumberComplete && cardExpiryComplete && cardCvcComplete);
  }, [cardNumberComplete, cardExpiryComplete, cardCvcComplete]);

  useEffect(() => {
    const initUpgrade = async () => {
      try {
        const res = await apiRequest("POST", "/api/subscription/change-plan", { priceId });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to initiate upgrade");
        }
        const data = await res.json();
        
        if (data.status === 'requires_payment' && data.clientSecret) {
          setUpgradeData({
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId || '',
            subscriptionId: data.subscriptionId,
            amount: data.amount,
            currency: data.currency || 'usd',
            currentPlanAmount: data.currentPlanAmount || null,
            newPlanAmount: data.newPlanAmount || null,
            currentPlan: data.currentPlan || currentPlanKey,
          });
        } else {
          throw new Error("Upgrade requires payment confirmation. Please try again.");
        }
      } catch (err: any) {
        console.error("Upgrade init error:", err);
        setErrorMessage(err.message || "Failed to prepare upgrade. Please try again.");
      } finally {
        setIsInitializing(false);
      }
    };

    initUpgrade();
  }, [priceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !upgradeData) return;

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(upgradeData.clientSecret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        const confirmRes = await apiRequest("POST", "/api/subscription/confirm-upgrade", {
          paymentIntentId: paymentIntent.id,
        });
        if (!confirmRes.ok) {
          const err = await confirmRes.json();
          throw new Error(err.error || "Failed to activate upgrade");
        }
        setIsProcessing(false);
        queryClient.removeQueries({ queryKey: ["/api/subscription/status"] });
        queryClient.removeQueries({ queryKey: ["/api/predictions/usage"] });
        queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
        setUpgradeSuccess(true);
        setTimeout(() => {
          setLocation('/dashboard');
        }, 5000);
        return;
      } else {
        setErrorMessage("Payment requires additional verification. Please contact support.");
      }
    } catch (err: any) {
      console.error("Upgrade payment error:", err);
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing your upgrade...</p>
      </div>
    );
  }

  if (upgradeSuccess) {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/40">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground">Upgrade Successful!</h3>
          <p className="text-muted-foreground">
            Your plan has been upgraded to <span className="text-primary font-semibold">{planName}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Your new features are now active. Redirecting to dashboard...
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <Loader2 className="w-3 h-3 animate-spin" />
            Redirecting in a few seconds...
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage && !upgradeData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      </div>
    );
  }

  const chargeAmount = upgradeData?.amount || fullAmount;
  const chargeCurrency = upgradeData?.currency || currency;

  const currentPlan = upgradeData?.currentPlan || currentPlanKey;
  const currentPlanName = currentPlan ? (PLAN_DISPLAY[currentPlan]?.name || currentPlan) : null;
  const currentPlanMonthly = upgradeData?.currentPlanAmount || (currentPlan ? PLAN_PRICES[currentPlan] : null);
  const newPlanMonthly = upgradeData?.newPlanAmount || fullAmount;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Payment Details</span>
        </div>

        <CardFields
          onCardNumberChange={(complete) => setCardNumberComplete(complete)}
          onCardExpiryChange={(complete) => setCardExpiryComplete(complete)}
          onCardCvcChange={(complete) => setCardCvcComplete(complete)}
          onError={(msg) => setErrorMessage(msg)}
          clearError={() => {
            if (!cardNumberComplete || !cardExpiryComplete || !cardCvcComplete) {
              setErrorMessage(null);
            }
          }}
        />

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{planName} Plan (Monthly)</span>
            <span>{formatPrice(newPlanMonthly, chargeCurrency)}/mo</span>
          </div>
          {currentPlanMonthly && currentPlanName && (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">- Credit from {currentPlanName} plan this month</span>
              <span className="text-green-500">-{formatPrice(currentPlanMonthly, chargeCurrency)}</span>
            </div>
          )}
          <div className="border-t border-border/40 pt-3 flex justify-between gap-2 font-bold">
            <span>Prorated Charge Today</span>
            <span className="text-primary">{formatPrice(chargeAmount, chargeCurrency)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            You only pay the price difference for the rest of this billing month. Starting next month, you'll be charged the full {formatPrice(newPlanMonthly, chargeCurrency)}/mo.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing || !cardComplete}
        data-testid="button-confirm-upgrade-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing Upgrade...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Confirm Upgrade - {formatPrice(chargeAmount, chargeCurrency)}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your payment is securely processed by Stripe.
        You can change your plan anytime from your account settings.
      </p>
    </form>
  );
}

function CheckoutContent() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const planId = params.get('plan');
  const isUpgradeMode = params.get('upgrade') === 'true';
  
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { data: plansData, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: stripeKeyData, isLoading: stripeLoading } = useStripePublishableKey();
  
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (stripeKeyData?.publishableKey && !stripePromise) {
      setStripePromise(loadStripe(stripeKeyData.publishableKey));
    }
  }, [stripeKeyData?.publishableKey]);
  
  const plans = plansData?.plans || [];
  const selectedPlan = plans.find(p => {
    const planKey = p.metadata?.plan;
    return planKey === planId;
  });
  
  const planKey = (selectedPlan?.metadata?.plan as keyof typeof PLAN_DISPLAY) || 'basic';
  const display = PLAN_DISPLAY[planKey] || PLAN_DISPLAY.basic;
  const price = selectedPlan?.prices?.[0];
  const Icon = display.icon;

  useEffect(() => {
    if (!plansLoading && !planId) {
      setLocation('/');
    }
  }, [plansLoading, planId, setLocation]);

  useEffect(() => {
    if (isUpgradeMode && !user) {
      setLocation('/login');
    }
  }, [isUpgradeMode, user, setLocation]);

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    setTimeout(() => {
      setLocation('/dashboard');
    }, 5000);
  };

  const isLoading = plansLoading || stripeLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedPlan || !price) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground mb-4">Plan not found</p>
            <Button onClick={() => setLocation('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center border-green-500/30 animate-in fade-in zoom-in-95 duration-500">
          <CardContent className="py-12">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-payment-success">
              {isUpgradeMode ? "Upgrade Successful!" : "Payment Successful!"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isUpgradeMode 
                ? `You've been upgraded to the ${display.name} plan.`
                : `Welcome to Gold Predict ${display.name}!`
              }
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Redirecting to your dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const backPath = isUpgradeMode ? '/upgrade' : '/';
  const backLabel = isUpgradeMode ? 'Back to Plans' : 'Change Plan';

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/30 bloom-gold">
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
            onClick={() => setLocation(backPath)}
            data-testid="button-back-plans"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-display font-bold mb-6">
              {isUpgradeMode ? "Upgrade Summary" : "Order Summary"}
            </h2>
            
            <Card className="border-primary/20" data-testid="card-order-summary">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${display.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${display.color}`} />
                  </div>
                  <div>
                    <CardTitle>{display.name} Plan</CardTitle>
                    <CardDescription>{display.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {display.highlights.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="pt-4 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{display.name} Plan (Monthly)</span>
                    <span className="text-xl font-bold">
                      {formatPrice(price.unitAmount, price.currency)}/mo
                    </span>
                  </div>
                  {isUpgradeMode && subscription?.plan && subscription.plan !== planKey && (
                    <>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Credit from {(subscription.plan || '').charAt(0).toUpperCase() + (subscription.plan || '').slice(1)} plan</span>
                        <span className="text-green-500">-{formatPrice(PLAN_PRICES[subscription.plan] || 0, price.currency)}</span>
                      </div>
                      <div className="border-t border-border/40 pt-3 flex items-center justify-between gap-2">
                        <span className="font-semibold">Prorated Charge Today</span>
                        <span className="text-lg font-bold text-primary">
                          ~{formatPrice(price.unitAmount - (PLAN_PRICES[subscription.plan] || 0), price.currency)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Exact amount depends on days remaining in your billing cycle. Full price starts next month.
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {!isUpgradeMode && (
              <Card className="mt-4 border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Secure Payment</p>
                      <p className="text-xs text-muted-foreground">
                        Your subscription renews automatically each month. You can cancel anytime from your account settings.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isUpgradeMode && (
              <Card className="mt-4 border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Prorated Billing</p>
                      <p className="text-xs text-muted-foreground">
                        You'll only pay the difference for the rest of your current billing period.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-display font-bold mb-6">
              {isUpgradeMode ? "Confirm & Pay" : "Create Account & Pay"}
            </h2>
            
            <Card data-testid="card-payment-details">
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Secure Checkout</p>
                    <p className="text-xs text-muted-foreground">
                      Your payment is protected with 256-bit encryption.
                    </p>
                  </div>
                </div>

                {stripePromise ? (
                  <Elements stripe={stripePromise}>
                    {isUpgradeMode ? (
                      <UpgradePaymentForm
                        planName={display.name}
                        priceId={price.id}
                        fullAmount={price.unitAmount}
                        currency={price.currency}
                        currentPlanKey={subscription?.plan || null}
                        onSuccess={handlePaymentSuccess}
                      />
                    ) : (
                      <PaymentForm
                        priceId={price.id}
                        planName={display.name}
                        amount={price.unitAmount}
                        currency={price.currency}
                        onSuccess={handlePaymentSuccess}
                        existingUser={null}
                      />
                    )}
                  </Elements>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Checkout() {
  return <CheckoutContent />;
}

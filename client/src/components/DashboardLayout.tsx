import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  LineChart, 
  Activity, 
  Settings, 
  Bell,
  X,
  Send,
  Loader2,
  User,
  LogOut,
  LogIn,
  CreditCard,
  Pencil
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { getMarketStatus } from "@/lib/marketHours";
import { useSubscription, useCustomerPortal } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  children: ReactNode;
}

function NotificationPopup({ onClose }: { onClose: () => void }) {
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasStarted) return;
    setHasStarted(true);

    const runStream = async () => {
      setIsStreaming(true);
      setError(null);

      try {
        const createRes = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Gold Market Analysis" }),
          credentials: "include",
        });
        if (!createRes.ok) throw new Error("Failed to create conversation");
        const newConv = await createRes.json();
        const chatId = newConv.id;

        const res = await fetch(`/api/conversations/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "Give me a concise market update for XAUUSD gold. Include: 1) Current Trend (bullish/bearish/neutral with brief reason), 2) Key Levels (support and resistance prices), 3) Technical Signals (RSI/MACD outlook), 4) Trading Suggestion (brief actionable idea). Keep it short and professional." }),
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to get analysis");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.content) {
                  accumulated += parsed.content;
                  setStreamedContent(accumulated);
                }
              } catch {}
            }
          }
        }
      } catch (err: any) {
        console.error("Notification stream error:", err);
        setError("Unable to load market analysis right now.");
      } finally {
        setIsStreaming(false);
      }
    };

    runStream();
  }, [hasStarted]);

  const parseContent = (raw: string) => {
    const sectionMap: Record<string, { icon: string; title: string; color: string }> = {
      'TREND': { icon: "trend", title: "Current Trend", color: "emerald" },
      'LEVELS': { icon: "levels", title: "Key Levels", color: "blue" },
      'SIGNALS': { icon: "technical", title: "Technical Signals", color: "purple" },
      'OUTLOOK': { icon: "action", title: "Trading Outlook", color: "amber" },
    };

    const lines = raw.split("\n");
    const sections: { icon: string; title: string; content: string; color: string }[] = [];
    let currentSection: { icon: string; title: string; content: string; color: string } | null = null;

    for (const line of lines) {
      const trimmed = line.replace(/^[\s\-\*]+/, '').replace(/[\*\#]/g, '').trim();
      if (!trimmed) continue;

      const markerMatch = trimmed.match(/^\[SECTION:(\w+)\]\s*(.*)/);
      if (markerMatch) {
        if (currentSection) sections.push(currentSection);
        const key = markerMatch[1];
        const meta = sectionMap[key] || { icon: "trend", title: key, color: "emerald" };
        const rest = markerMatch[2]?.trim() || '';
        currentSection = { ...meta, content: rest };
      } else if (currentSection) {
        currentSection.content += (currentSection.content ? "\n" : "") + trimmed;
      } else {
        currentSection = { icon: "trend", title: "Market Overview", content: trimmed, color: "emerald" };
      }
    }
    if (currentSection) sections.push(currentSection);
    return sections;
  };

  const sections = streamedContent ? parseContent(streamedContent) : [];
  const iconColors: Record<string, string> = {
    emerald: "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/10 ring-blue-500/20",
    purple: "text-purple-500 bg-purple-500/10 ring-purple-500/20",
    amber: "text-amber-500 bg-amber-500/10 ring-amber-500/20",
  };

  return (
    <div className="absolute top-16 right-0 sm:right-6 w-[340px] bg-card rounded-2xl overflow-hidden z-50 border border-border shadow-2xl animate-in fade-in slide-in-from-top-2" data-testid="notification-popup">
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-amber-500/10">
        <h4 className="text-sm font-bold text-primary flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5" />
          </div>
          Market AI Analysis
        </h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50" data-testid="button-close-notifications">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {error ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
              <Activity className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : isStreaming && sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <div className="relative mb-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            </div>
            <span className="animate-pulse tracking-widest uppercase text-[10px] font-bold text-primary/60">Synthesizing Alpha...</span>
            <span className="text-[10px] text-muted-foreground/50 mt-1">Analyzing market conditions</span>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {sections.map((section, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden hover:border-border transition-colors">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/30">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center ring-1 ${iconColors[section.color] || iconColors.emerald}`}>
                    {section.icon === "trend" && <Activity className="w-3 h-3" />}
                    {section.icon === "levels" && <LineChart className="w-3 h-3" />}
                    {section.icon === "technical" && <Activity className="w-3 h-3" />}
                    {section.icon === "action" && <Send className="w-3 h-3" />}
                  </div>
                  <span className="text-[11px] font-semibold text-foreground">{section.title}</span>
                </div>
                <div className="px-3 py-2">
                  {section.content.split("\n").map((line, j) => (
                    <p key={j} className="text-[11px] leading-relaxed text-muted-foreground">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 px-2 py-1">
                <Loader2 className="w-3 h-3 animate-spin text-primary/40" />
                <span className="text-[10px] text-muted-foreground/50">Streaming...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-2.5 bg-muted/30 text-[10px] text-center text-muted-foreground border-t border-border flex items-center justify-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-primary/40" />
        AI-generated analysis · Not financial advice
      </div>
    </div>
  );
}

function AuthRequiredScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login, register, isLoggingIn, isRegistering } = useAuth();

  const isLoading = isLoggingIn || isRegistering;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (isRegister) {
        await register({ email, password });
      } else {
        await login({ email, password });
      }
    } catch (err: any) {
      let errorMessage = "Something went wrong. Please try again.";
      const raw = err?.message || "";
      try {
        const jsonMatch = raw.match(/\{.*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.message) {
            const msg = parsed.message.toLowerCase();
            if (msg.includes('no account found')) {
              errorMessage = 'No account found with this email. Please check your email or create a new account.';
            } else if (msg.includes('incorrect password')) {
              errorMessage = 'Incorrect password. Please try again.';
            } else if (msg.includes('too many')) {
              errorMessage = 'Too many attempts. Please try again later.';
            } else if (msg.includes('exists') || msg.includes('already')) {
              errorMessage = 'An account with this email already exists. Please sign in instead.';
            } else {
              errorMessage = parsed.message;
            }
          }
        }
      } catch {
      }
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <LineChart className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 tracking-tight mb-2">
            Gold Predict Pro
          </h1>
          <p className="text-muted-foreground">
            Real-time XAUUSD market analysis and AI-powered predictions
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {isRegister ? "Create Account" : "Sign In"}
            </h2>
          </div>
          <p className="text-muted-foreground mb-6">
            {isRegister 
              ? "Create an account to access live market data and AI-powered analysis."
              : "Sign in to access live market data, trading signals, and AI-powered notifications."}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive" data-testid="text-auth-error">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50"
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "Choose a password (min. 6 characters)" : "Enter your password"}
                required
                minLength={isRegister ? 6 : 1}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50"
                data-testid="input-password"
              />
            </div>
            
            <Button type="submit" size="lg" className="w-full" disabled={isLoading} data-testid="button-confirm">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isRegister ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
              data-testid="button-toggle-auth-mode"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
        
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-card/50 rounded-lg border border-border/50">
            <div className="text-2xl font-bold text-primary">Live</div>
            <div className="text-xs text-muted-foreground">Price Data</div>
          </div>
          <div className="p-3 bg-card/50 rounded-lg border border-border/50">
            <div className="text-2xl font-bold text-primary">AI</div>
            <div className="text-xs text-muted-foreground">Analysis</div>
          </div>
          <div className="p-3 bg-card/50 rounded-lg border border-border/50">
            <div className="text-2xl font-bold text-primary">Pro</div>
            <div className="text-xs text-muted-foreground">Signals</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function SubscriptionRequiredScreen() {
  const [, setLocation] = useLocation();
  const { logout, isLoggingOut } = useAuth();
  const { subscription } = useSubscription();
  const { mutate: openPortal, isPending: isPortalLoading } = useCustomerPortal();

  const status = subscription?.status;
  const expiresAt = subscription?.expiresAt;
  const hasStripeCustomer = !!subscription?.stripeCustomerId;
  
  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : null;

  const isExpired = status === 'canceled' || (status === 'inactive' && hasStripeCustomer);
  const isPaymentFailed = status === 'past_due';

  let title = "Unlock Gold Predict";
  let subtitle = "Get access to professional-grade gold market analysis and trading tools";
  let description = "Choose a plan to unlock real-time market data, AI predictions, and professional trading signals.";
  let primaryButtonText = "View Subscription Plans";
  let showRenewButton = false;
  let alertType: 'expired' | 'payment' | null = null;

  if (isPaymentFailed) {
    title = "Payment Failed";
    subtitle = "We couldn't process your last payment";
    description = "Please update your payment method to continue using Gold Predict. Your access will be restored immediately after successful payment.";
    primaryButtonText = "Update Payment Method";
    showRenewButton = true;
    alertType = 'payment';
  } else if (isExpired) {
    title = "Subscription Expired";
    subtitle = expiryDate 
      ? `Your subscription ended on ${expiryDate}`
      : "Your subscription has expired";
    description = "Renew your subscription to continue accessing real-time market data, AI predictions, and professional trading signals.";
    primaryButtonText = "Renew Subscription";
    showRenewButton = true;
    alertType = 'expired';
  }

  const handlePrimaryAction = () => {
    if (showRenewButton && hasStripeCustomer) {
      openPortal();
    } else {
      setLocation('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <div className={`absolute inset-0 rounded-2xl blur-xl animate-pulse ${
              alertType === 'payment' 
                ? 'bg-gradient-to-br from-red-500/30 to-red-600/30' 
                : alertType === 'expired'
                ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30'
                : 'bg-gradient-to-br from-primary/30 to-amber-500/30'
            }`} />
            <div className={`relative w-24 h-24 rounded-2xl flex items-center justify-center border ${
              alertType === 'payment' 
                ? 'bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30' 
                : alertType === 'expired'
                ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/30'
                : 'bg-gradient-to-br from-primary/20 to-amber-500/20 border-primary/30'
            }`}>
              {alertType === 'payment' ? (
                <CreditCard className="w-12 h-12 text-red-500" />
              ) : alertType === 'expired' ? (
                <CreditCard className="w-12 h-12 text-amber-500" />
              ) : (
                <LineChart className="w-12 h-12 text-primary" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 tracking-tight" data-testid="text-subscription-required-title">
            {title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {subtitle}
          </p>
        </div>

        {alertType === 'payment' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400 font-medium text-center">
              Your payment method was declined. Please update your card to restore access.
            </p>
          </div>
        )}
        
        {alertType === 'expired' && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-sm text-amber-400 font-medium text-center">
              Don't miss out on market opportunities! Renew now to get back to trading.
            </p>
          </div>
        )}

        {!alertType && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 text-center space-y-3 hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <Activity className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-sm">Live Price Tracking</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Real-time XAU/USD price data with candlestick charts
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 text-center space-y-3 hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <LineChart className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="font-semibold text-sm">AI Predictions</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Statistical models to forecast gold price movements
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-5 text-center space-y-3 hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                <Activity className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="font-semibold text-sm">Trading Signals</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Entry, target, and stop-loss levels from technical analysis
              </p>
            </div>
          </div>
        )}

        <div className="bg-card border border-primary/20 rounded-xl p-6 bg-gradient-to-br from-primary/5 to-amber-500/5">
          <p className="text-sm text-muted-foreground text-center mb-4">
            {description}
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-muted-foreground">RSI, MACD & SMA indicators</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-muted-foreground">AI-powered predictions</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-muted-foreground">Real-time trading alerts</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-muted-foreground">24/5 market coverage</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-primary to-amber-600 h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
              onClick={handlePrimaryAction}
              disabled={isPortalLoading}
              data-testid="button-renew-subscription"
            >
              {isPortalLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5 mr-2" />
              )}
              {primaryButtonText}
            </Button>

            {showRenewButton && (
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full" 
                onClick={() => setLocation('/')}
                data-testid="button-view-all-plans"
              >
                View All Plans
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1" 
            onClick={() => {
              logout();
              setLocation('/login');
            }}
            disabled={isLoggingOut}
            data-testid="button-switch-account"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            Switch Account
          </Button>
          
          <Button 
            variant="ghost" 
            size="lg" 
            className="flex-1 text-muted-foreground" 
            onClick={() => logout()}
            disabled={isLoggingOut}
            data-testid="button-logout-subscription"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            Sign Out
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Plans start at $9.99/month · Cancel anytime · Secure payment via Stripe
        </p>
      </div>
    </div>
  );
}

function UserProfileButton() {
  const { user, isLoading, isAuthenticated, logout, isLoggingOut, updateProfile, isUpdatingProfile } = useAuth();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState("");

  // Get display name: nickname > firstName lastName > email prefix
  const displayName = user?.nickname || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email?.split('@')[0] || 'User');

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  const handleEditNickname = () => {
    setNickname(user?.nickname || user?.email?.split('@')[0] || "");
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    if (nickname.trim()) {
      try {
        await updateProfile({ nickname: nickname.trim() });
        setIsEditingNickname(false);
      } catch (error) {
        console.error("Failed to update nickname:", error);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditingNickname(false);
    setNickname("");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-amber-600 flex items-center justify-center border border-border focus:outline-none focus:ring-2 focus:ring-primary/50" data-testid="button-user-profile">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-primary-foreground" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-2">
          {isEditingNickname ? (
            <div className="space-y-2">
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname"
                data-testid="input-nickname"
                autoFocus
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNickname();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={handleSaveNickname}
                  disabled={isUpdatingProfile || !nickname.trim()}
                  data-testid="button-save-nickname"
                  className="flex-1"
                >
                  {isUpdatingProfile ? "Saving..." : "Save"}
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  data-testid="button-cancel-nickname"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="cursor-pointer hover-elevate rounded p-1 -m-1 transition-colors group"
              onClick={handleEditNickname}
              data-testid="button-edit-nickname"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground">{user?.email || 'No email'}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Click to edit nickname</p>
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-destructive focus:text-destructive"
          data-testid="button-logout"
        >
          {isLoggingOut ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MarketStatusIndicator() {
  const [status, setStatus] = useState(getMarketStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getMarketStatus());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="market-status">
      <span className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
      <span>Market: <span className={status.isOpen ? 'text-emerald-500' : 'text-red-500'}>{status.label}</span></span>
      <span className="hidden sm:inline text-xs opacity-60">· {status.nextChange}</span>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  const { isActive, isLoading: subLoading } = useSubscription();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: LineChart, label: "Market Analysis", href: "/analysis" },
    { icon: Activity, label: "Live Signals", href: "/signals" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  // Show loading screen while checking auth or subscription
  if (isLoading || subLoading) {
    return <AuthLoadingScreen />;
  }

  // Show login screen when not authenticated
  if (!isAuthenticated) {
    return <AuthRequiredScreen />;
  }

  // Show subscription required screen if no active subscription
  if (!isActive) {
    return <SubscriptionRequiredScreen />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-body">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border/40 flex-shrink-0 z-20">
        <div className="p-6 border-b border-border/40">
          <div className="flex items-center gap-3 mb-1 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-all duration-300 bloom-gold">
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

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 bloom-nav
                ${isActive 
                  ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/20" 
                  : "text-muted-foreground hover:text-foreground"}
              `}>
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10 px-6 flex items-center justify-between">
          <MarketStatusIndicator />
          
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 transition-all relative rounded-lg bloom-hover ${showNotifications ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5" />
              {!showNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-background" />}
            </button>
            {showNotifications && <NotificationPopup onClose={() => setShowNotifications(false)} />}
            <UserProfileButton />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
        
        {/* Decorative background effects */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 blur-[100px] pointer-events-none -z-10" />
      </main>
    </div>
  );
}

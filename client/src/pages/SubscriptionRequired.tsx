import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Crown, 
  LineChart, 
  TrendingUp, 
  Zap, 
  BarChart3,
  ArrowLeft,
  Shield,
  Clock,
  Star,
  ChevronRight,
  Activity,
  Target,
  Bell
} from "lucide-react";

export default function SubscriptionRequired() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
            onClick={() => setLocation('/')}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-amber-500/30 blur-xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center border border-primary/30">
                <Crown className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-display font-bold" data-testid="text-subscription-required-title">
              Unlock Gold Predict
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Get access to professional-grade gold market analysis, AI predictions, and real-time trading signals
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <TrendingUp className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-sm">Live Price Tracking</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Real-time XAU/USD price data with candlestick charts and trend visualization
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                  <Zap className="w-7 h-7 text-blue-500" />
                </div>
                <h3 className="font-semibold text-sm">AI Predictions</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Statistical models analyze market patterns to forecast price movements
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                  <BarChart3 className="w-7 h-7 text-purple-500" />
                </div>
                <h3 className="font-semibold text-sm">Trading Signals</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Entry, target, and stop-loss levels generated from technical analysis
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-amber-500/5 overflow-hidden">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">What's included with your subscription</h3>
                  <p className="text-xs text-muted-foreground">Choose a plan that fits your trading needs</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Activity className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">RSI, MACD & SMA indicators</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Target className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">AI-powered price predictions</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Bell className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Real-time trading alerts</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Professional risk management</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">24/5 market coverage</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <LineChart className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Interactive charting tools</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-primary to-amber-600 h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              onClick={() => setLocation('/')}
              data-testid="button-view-plans"
            >
              <Crown className="w-5 h-5 mr-2" />
              View Subscription Plans
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Plans start at $9.99/month · Cancel anytime · Secure payment via Stripe
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

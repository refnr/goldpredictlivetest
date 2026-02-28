import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import LandingPricing from "@/pages/LandingPricing";
import Login from "@/pages/Login";
import Checkout from "@/pages/Checkout";
import Home from "@/pages/Home";
import Analysis from "@/pages/Analysis";
import Signals from "@/pages/Signals";
import Settings from "@/pages/Settings";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import SubscriptionRequired from "@/pages/SubscriptionRequired";
import UpgradePlan from "@/pages/UpgradePlan";
import NotFound from "@/pages/not-found";
import type { UserSettings } from "@shared/schema";

function ThemeHandler() {
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['/api/settings'],
  });

  useEffect(() => {
    if (settings) {
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [settings]);

  return null;
}

function Router() {
  return (
    <Switch>
      {/* Public routes - no auth required */}
      <Route path="/" component={LandingPricing} />
      <Route path="/login" component={Login} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/subscription/success" component={SubscriptionSuccess} />
      <Route path="/subscription/required" component={SubscriptionRequired} />
      
      {/* Protected routes - require auth + subscription */}
      <Route path="/upgrade" component={UpgradePlan} />
      <Route path="/dashboard" component={Home} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/signals" component={Signals} />
      <Route path="/settings" component={Settings} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeHandler />
        <Toaster />
        <PageTransition>
          <Router />
        </PageTransition>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

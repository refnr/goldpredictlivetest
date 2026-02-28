import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserSettings, Timeframe } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSubscription, useCustomerPortal } from "@/hooks/use-subscription";
import { useLocation } from "wouter";
import { 
  Settings as SettingsIcon, 
  Clock, 
  Moon, 
  RefreshCw,
  Palette,
  Gauge,
  CreditCard,
  Crown,
  Loader2,
  ExternalLink
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { subscription, plan, isActive, isLoading: subLoading } = useSubscription();
  const customerPortal = useCustomerPortal();

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['/api/settings'],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const res = await apiRequest('PUT', '/api/settings', updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleUpdate = (key: keyof UserSettings, value: any) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-3xl font-display font-bold mb-1">Settings</h2>
          <p className="text-muted-foreground">
            Configure your trading preferences and application settings
          </p>
        </div>

        {/* Trading Preferences */}
        <Card className="border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              Trading Preferences
            </CardTitle>
            <CardDescription>
              Configure default settings for market analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Default Timeframe</Label>
                <p className="text-sm text-muted-foreground">
                  The default timeframe used for analysis
                </p>
              </div>
              <Select 
                value={settings?.defaultTimeframe} 
                onValueChange={(val) => handleUpdate('defaultTimeframe', val as Timeframe)}
                data-testid="select-default-timeframe"
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="30m">30 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Auto Refresh Settings */}
        <Card className="border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Auto Refresh
            </CardTitle>
            <CardDescription>
              Configure automatic data refresh settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Auto Refresh</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh price and analysis data
                </p>
              </div>
              <Switch 
                checked={settings?.autoRefresh}
                onCheckedChange={(checked) => handleUpdate('autoRefresh', checked)}
                data-testid="switch-auto-refresh"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Refresh Interval</Label>
                <p className="text-sm text-muted-foreground">
                  How often to refresh data (in seconds)
                </p>
              </div>
              <Select 
                value={String(settings?.refreshInterval)} 
                onValueChange={(val) => handleUpdate('refreshInterval', Number(val))}
                disabled={!settings?.autoRefresh}
                data-testid="select-refresh-interval"
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Dark Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Use dark theme for the interface
                </p>
              </div>
              <Switch 
                checked={settings?.darkMode}
                onCheckedChange={(checked) => handleUpdate('darkMode', checked)}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Management */}
        <Card className="border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Subscription
            </CardTitle>
            <CardDescription>
              Manage your subscription plan and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base flex items-center gap-2">
                  Current Plan
                  {isActive && plan !== 'free' && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <Crown className="w-3 h-3 mr-1" />
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isActive && plan !== 'free' 
                    ? `Your ${plan} subscription is active` 
                    : subscription?.status === 'canceled'
                      ? 'Your subscription has been canceled'
                      : subscription?.status === 'past_due'
                        ? 'Payment failed — please update your payment method to restore access'
                        : 'You are on the free tier with limited access'}
                </p>
                {subscription?.startedAt && isActive && (
                  <p className="text-xs text-muted-foreground">
                    Started on {new Date(subscription.startedAt).toLocaleDateString()}
                  </p>
                )}
                {subscription?.expiresAt && isActive && (
                  <p className="text-xs text-muted-foreground">
                    Next renewal: {new Date(subscription.expiresAt).toLocaleDateString()}
                  </p>
                )}
                {subscription?.expiresAt && !isActive && subscription?.status === 'canceled' && (
                  <p className="text-xs text-destructive">
                    Access ended on {new Date(subscription.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {isActive && plan !== 'free' ? (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => customerPortal.mutate()}
                      disabled={customerPortal.isPending}
                      data-testid="button-manage-subscription"
                    >
                      {customerPortal.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Manage Billing
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setLocation('/upgrade')}
                      data-testid="button-change-plan"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Change Plan
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => setLocation('/')}
                    data-testid="button-upgrade-subscription"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Subscribe
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card className="border-white/5 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Gold Predict {plan === 'premium' ? 'Premium' : plan === 'pro' ? 'Pro' : plan === 'basic' ? 'Basic' : 'Free'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Version 1.0.0 - Real-time XAUUSD Analysis & Predictions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

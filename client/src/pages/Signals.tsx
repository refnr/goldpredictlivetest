import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";
import type { Timeframe, SignalResponse, LivePrice } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target,
  Shield,
  Activity,
  RefreshCw,
  Plus,
  X,
  Lock,
  Zap
} from "lucide-react";

export default function Signals() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [, setLocation] = useLocation();
  const { hasFeature } = useSubscription();
  const hasSignalsAccess = hasFeature("signals");

  const { data: livePrice } = useQuery<LivePrice>({
    queryKey: ['/api/live-price'],
    refetchInterval: 5000,
  });

  const { data: signals, isLoading } = useQuery<SignalResponse[]>({
    queryKey: ['/api/signals'],
    refetchInterval: 10000,
  });

  const generateMutation = useMutation({
    mutationFn: async (tf: Timeframe) => {
      const res = await apiRequest('POST', '/api/signals/generate', { timeframe: tf });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate signal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/signals/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals'] });
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate(timeframe);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const activeSignals = signals?.filter(s => s.status === 'ACTIVE') || [];
  const historySignals = signals?.filter(s => s.status !== 'ACTIVE') || [];

  const getSignalIcon = (type: string) => {
    if (type === 'BUY') return <TrendingUp className="w-5 h-5 text-emerald-400" />;
    if (type === 'SELL') return <TrendingDown className="w-5 h-5 text-rose-400" />;
    return <Activity className="w-5 h-5 text-yellow-400" />;
  };

  const getSignalColor = (type: string) => {
    if (type === 'BUY') return 'border-l-emerald-500 bg-emerald-500/5';
    if (type === 'SELL') return 'border-l-rose-500 bg-rose-500/5';
    return 'border-l-yellow-500 bg-yellow-500/5';
  };

  const getPnLColor = (pnl: number | undefined) => {
    if (!pnl) return 'text-muted-foreground';
    return pnl >= 0 ? 'text-emerald-400' : 'text-rose-400';
  };

  if (!hasSignalsAccess) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground mb-1">Live Signals</h2>
            <p className="text-muted-foreground">Real-time trading signals for XAUUSD</p>
          </div>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Trading Signals Locked</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Trading signals are available on <strong>Pro</strong> and <strong>Premium</strong> plans. 
                Upgrade your subscription to access real-time buy/sell signals with entry, target, and stop-loss prices.
              </p>
              <Button onClick={() => setLocation('/upgrade')} className="mt-4" data-testid="button-upgrade-signals">
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground mb-1">Live Signals</h2>
            <div className="text-muted-foreground flex items-center gap-2">
              <span>Real-time trading signals for XAUUSD</span>
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                LIVE
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select 
              value={timeframe} 
              onValueChange={(val) => setTimeframe(val as Timeframe)}
            >
              <SelectTrigger className="w-[120px] bg-card border-border text-foreground h-10 rounded-xl" data-testid="select-signal-timeframe">
                <SelectValue placeholder="Timeframe" />
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

            <Button onClick={handleGenerate} disabled={generateMutation.isPending} data-testid="button-generate-signal">
              {generateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Generate Signal
            </Button>
          </div>
        </div>

        {/* Live Price Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current XAUUSD</p>
                  <p className="text-3xl font-bold font-mono text-foreground">
                    ${livePrice?.price.toFixed(2) || '----.--'}
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Active Signals</p>
                  <p className="text-2xl font-bold text-primary">{activeSignals.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {historySignals.length > 0 
                      ? Math.round((historySignals.filter(s => s.status === 'HIT_TARGET').length / historySignals.length) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Signals */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Active Signals
          </h3>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading signals...</div>
          ) : activeSignals.length === 0 ? (
            <Card className="border-white/5 border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">No active signals. Generate a new signal to start trading.</p>
                <Button onClick={handleGenerate} variant="outline" data-testid="button-generate-first-signal">
                  <Plus className="w-4 h-4 mr-2" /> Generate First Signal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeSignals.map(signal => (
                <Card key={signal.id} className={`border-l-4 ${getSignalColor(signal.type)} relative`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
                    onClick={() => handleDelete(signal.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-signal-${signal.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <CardContent className="py-4 pr-12">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          signal.type === 'BUY' ? 'bg-emerald-500/20' : 
                          signal.type === 'SELL' ? 'bg-rose-500/20' : 'bg-yellow-500/20'
                        }`}>
                          {getSignalIcon(signal.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={signal.type === 'BUY' ? 'default' : signal.type === 'SELL' ? 'destructive' : 'secondary'}>
                              {signal.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
                          </div>
                          <p className="text-xl font-bold font-mono mt-1">
                            Entry: ${signal.price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-6">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1">
                            <Target className="w-3 h-3" /> Target
                          </div>
                          <p className="font-mono font-bold text-emerald-400">
                            ${signal.targetPrice?.toFixed(2) || '---'}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-xs text-rose-400 mb-1">
                            <Shield className="w-3 h-3" /> Stop Loss
                          </div>
                          <p className="font-mono font-bold text-rose-400">
                            ${signal.stopLoss?.toFixed(2) || '---'}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">P&L</div>
                          <p className={`font-mono font-bold ${getPnLColor(signal.pnl)}`}>
                            {signal.pnl && signal.pnl >= 0 ? '+' : ''}{signal.pnl?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                          <p className="font-mono font-bold text-primary">
                            {signal.confidence.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Signal History */}
        {historySignals.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Signal History
            </h3>
            <Card className="border-white/5">
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {historySignals.slice(0, 10).map(signal => (
                    <div key={signal.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getSignalIcon(signal.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{signal.type}</span>
                            <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Entry: ${signal.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge variant={signal.status === 'HIT_TARGET' ? 'default' : 'destructive'}>
                            {signal.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(signal.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
                          onClick={() => handleDelete(signal.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-history-signal-${signal.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

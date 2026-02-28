import { useState } from "react";
import { usePrediction, usePredictionUsage } from "@/hooks/use-prediction";
import { useSubscription } from "@/hooks/use-subscription";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { PredictionChart } from "@/components/PredictionChart";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Target, 
  BarChart2, 
  Clock, 
  RefreshCw,
  Zap,
  AlertTriangle,
  Lock
} from "lucide-react";
import { type Timeframe } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

export default function Home() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [, setLocation] = useLocation();
  const { mutate, isPending, data, error } = usePrediction();
  const { data: usage, isLoading: usageLoading } = usePredictionUsage();
  const { hasIndicator } = useSubscription();

  // Check if limit is reached
  const isLimitReached = usage && usage.limit !== 'unlimited' && usage.used >= usage.limit;
  const remainingPredictions = usage?.remaining;


  const handleAnalyze = () => {
    if (isLimitReached) return;
    mutate({ symbol: "XAUUSD=X", timeframe });
  };

  const isUp = data?.direction === "UP";
  const isDown = data?.direction === "DOWN";
  const signalColor = isUp ? "text-emerald-400" : isDown ? "text-rose-400" : "text-yellow-400";
  const signalBg = isUp ? "bg-emerald-500/10 border-emerald-500/20" : isDown ? "bg-rose-500/10 border-rose-500/20" : "bg-yellow-500/10 border-yellow-500/20";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground mb-1">Market Overview</h2>
            <p className="text-muted-foreground flex items-center gap-2">
              <span>XAU/USD Gold Spot US Dollar</span>
              <span className="w-1 h-1 bg-muted-foreground rounded-full" />
              <span className="font-mono text-primary text-xs">REAL-TIME</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Prediction Usage Badge */}
            {usage && (
              <Badge 
                variant={isLimitReached ? "destructive" : "secondary"}
                className="h-10 px-3 flex items-center gap-2"
                data-testid="badge-prediction-usage"
              >
                <Zap className="w-3 h-3" />
                {usage.limit === 'unlimited' ? (
                  <span>Unlimited</span>
                ) : isLimitReached ? (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Limit Reached ({usage.used}/{usage.limit})
                  </span>
                ) : (
                  <span>{usage.remaining} analyses left</span>
                )}
              </Badge>
            )}

            <Select 
              value={timeframe} 
              onValueChange={(val) => {
                setTimeframe(val as Timeframe);
              }}
              disabled={isPending || isLimitReached}
            >
              <SelectTrigger className="w-[120px] bg-card border-border text-foreground h-10 rounded-xl" data-testid="select-timeframe-home">
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

            {isLimitReached ? (
              <button
                onClick={() => setLocation('/upgrade')}
                className="h-10 px-6 rounded-xl font-semibold bg-gradient-to-r from-primary to-amber-600 text-primary-foreground hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                data-testid="button-upgrade-plan"
              >
                Upgrade Plan
              </button>
            ) : (
              <button
                onClick={handleAnalyze}
                disabled={isPending}
                className="h-10 px-6 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-analyze"
              >
                {isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Analyze
              </button>
            )}
          </div>
        </div>

        {/* Prediction Results Section */}
        {error ? (
          <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20 text-center">
            <p className="text-red-400 mb-2 font-medium">Failed to load prediction data</p>
            <p className="text-sm text-red-400/60 mb-4">{error.message}</p>
            <button 
              onClick={handleAnalyze} 
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !data && !isPending ? (
           <div className="h-[400px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
             <p className="text-muted-foreground">Select a timeframe and click Analyze to begin.</p>
           </div>
        ) : (
          <>
            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Current Price"
                value={`$${data ? data.currentPrice.toFixed(2) : "0.00"}`}
                icon={<DollarSign className="w-8 h-8 text-primary" />}
                className="border-l-4 border-l-primary"
              />
              
              <MetricCard
                title="Predicted Price"
                value={`$${data ? data.predictedPrice.toFixed(2) : "0.00"}`}
                trend={data?.direction === "UP" ? "up" : data?.direction === "DOWN" ? "down" : "neutral"}
                trendValue={data ? `${data.changePercent.toFixed(2)}%` : "0%"}
                icon={<Target className="w-8 h-8 text-blue-400" />}
              />

              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Activity className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Signal</h3>
                <div className={`text-3xl font-display font-bold ${signalColor} dark:text-inherit`}>
                  {isPending ? "..." : data?.signal}
                </div>
                <div className={`mt-2 inline-flex px-2 py-0.5 text-xs font-bold rounded uppercase border ${signalBg} ${signalColor}`}>
                  Confidence: {data ? data.confidence.toFixed(1) : 0}%
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                 <div>
                   <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Accuracy Metrics</h3>
                   <div className="flex justify-between items-end">
                     <div>
                       <div className="text-xs text-muted-foreground">RMSE</div>
                       <div className="text-xl font-mono font-bold">{data?.metrics.rmse.toFixed(3) || "0.00"}</div>
                     </div>
                     <div className="text-right">
                       <div className="text-xs text-muted-foreground">MAE</div>
                       <div className="text-xl font-mono font-bold">{data?.metrics.mae.toFixed(3) || "0.00"}</div>
                     </div>
                   </div>
                 </div>
                 <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                   <div 
                     className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
                     style={{ width: `${data ? data.confidence : 0}%` }}
                   />
                 </div>
              </div>
            </div>

            {/* Main Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <div className="lg:col-span-2 space-y-6">
                <PredictionChart data={data} isLoading={isPending} />
                
                {/* Technical Indicators Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-card border border-white/5">
                    <div className="text-xs text-muted-foreground mb-1">RSI (14)</div>
                    <div className="font-mono text-lg font-bold">
                      {data?.analysis.rsi?.toFixed(2) || "N/A"}
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl bg-card border border-white/5 ${!hasIndicator('macd') ? 'opacity-50' : ''}`}>
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      MACD
                      {!hasIndicator('macd') && <Lock className="w-3 h-3 text-primary" />}
                    </div>
                    {hasIndicator('macd') ? (
                      <div className={`font-mono text-lg font-bold ${
                        (data?.analysis.macd?.histogram || 0) > 0 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {data?.analysis.macd?.histogram.toFixed(4) || "N/A"}
                      </div>
                    ) : (
                      <div className="font-mono text-sm text-muted-foreground">Pro+</div>
                    )}
                  </div>
                  <div className={`p-4 rounded-xl bg-card border border-white/5 ${!hasIndicator('sma') ? 'opacity-50' : ''}`}>
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      SMA (20)
                      {!hasIndicator('sma') && <Lock className="w-3 h-3 text-primary" />}
                    </div>
                    {hasIndicator('sma') ? (
                      <div className="font-mono text-lg font-bold">
                        {data?.analysis.sma?.toFixed(2) || "N/A"}
                      </div>
                    ) : (
                      <div className="font-mono text-sm text-muted-foreground">Pro+</div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-white/5">
                    <div className="text-xs text-muted-foreground mb-1">EMA (20)</div>
                    <div className="font-mono text-lg font-bold">
                      {data?.analysis.ema?.toFixed(2) || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Panel */}
              <div className="glass-panel p-6 rounded-2xl h-full">
                <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary" />
                  Technical Analysis
                </h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Market Trend</span>
                      <span className={`font-bold ${isUp ? "text-emerald-400" : isDown ? "text-rose-400" : "text-foreground"}`}>
                        {data?.direction === "UP" ? "BULLISH" : data?.direction === "DOWN" ? "BEARISH" : "NEUTRAL"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex">
                      <div className={`h-full ${isUp ? 'bg-emerald-500 w-3/4' : 'bg-emerald-500/20 w-1/2'}`}></div>
                      <div className={`h-full ${isDown ? 'bg-rose-500 w-3/4' : 'bg-rose-500/20 w-1/2'}`}></div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-medium text-foreground">Price Targets</h4>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                         <span className="text-xs text-emerald-200">Resistance</span>
                         <span className="font-mono font-bold text-emerald-400">
                           {data ? (data.currentPrice * 1.005).toFixed(2) : "---"}
                         </span>
                       </div>
                       <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                         <span className="text-xs text-muted-foreground">Current</span>
                         <span className="font-mono font-bold text-foreground">
                            {data ? data.currentPrice.toFixed(2) : "---"}
                         </span>
                       </div>
                       <div className="flex justify-between items-center p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                         <span className="text-xs text-rose-200">Support</span>
                         <span className="font-mono font-bold text-rose-400">
                            {data ? (data.currentPrice * 0.995).toFixed(2) : "---"}
                         </span>
                       </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-start gap-3 text-sm text-muted-foreground bg-white/5 p-4 rounded-xl">
                      <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>
                        Prediction valid for the next <span className="text-foreground font-medium">{timeframe}</span> based on current volatility and momentum indicators.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Cell
} from "recharts";
import { format } from "date-fns";
import { useState } from "react";
import type { PredictionResponse } from "@shared/schema";
import { Loader2, TrendingUp, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PredictionChartProps {
  data?: PredictionResponse;
  isLoading: boolean;
}

export function PredictionChart({ data, isLoading }: PredictionChartProps) {
  const [zoom, setZoom] = useState(1);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-card/30 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          </div>
          <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase animate-pulse">Analyzing Market Data...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Combine historical candles and forecast into one dataset for charting
  const fullChartData = [
    ...data.candles.map(c => ({
      ...c,
      price: c.high, // Use HIGH price for the line
      timestamp: new Date(c.time).getTime(),
      displayDate: format(new Date(c.time), 'HH:mm'),
      isForecast: false
    })),
    // Add forecast points
    ...data.forecast.map(f => ({
      time: f.time,
      price: f.price,
      timestamp: new Date(f.time).getTime(),
      displayDate: format(new Date(f.time), 'HH:mm'),
      isForecast: true
    }))
  ];

  // Apply zoom by slicing the data
  const dataPoints = Math.max(10, Math.floor(fullChartData.length / zoom));
  const chartData = fullChartData.slice(-dataPoints);

  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));

  return (
    <div className="w-full h-[500px] glass-panel p-6 rounded-2xl relative border border-white/5 shadow-2xl overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="font-display font-bold text-xl text-foreground tracking-tight flex items-center gap-2">
            XAUUSD Market Trend
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-mono uppercase tracking-tighter">
              High Price Line
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Real-time gold spot analysis & AI forecast</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleZoomIn}
              className="h-8 w-8"
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleZoomOut}
              className="h-8 w-8"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Current Price</span>
            <span className="text-lg font-mono font-bold text-primary">${data.currentPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
            <XAxis 
              dataKey="displayDate" 
              stroke="currentColor"
              opacity={0.5}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
              padding={{ left: 10, right: 10 }}
              height={50}
            />
            <YAxis 
              domain={[minPrice - padding, maxPrice + padding]}
              orientation="right"
              stroke="currentColor"
              opacity={0.5}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${val.toFixed(0)}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="glass-panel border border-border p-3 shadow-xl backdrop-blur-md">
                      <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{format(data.timestamp, 'MMM dd, HH:mm')}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-foreground">${data.price.toFixed(2)}</span>
                        {data.isForecast && (
                          <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold">Forecast</span>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2, fill: '#fff' }}
              animationDuration={1000}
            />
            
            <ReferenceLine 
              y={data.currentPrice} 
              stroke="currentColor" 
              opacity={0.2}
              strokeDasharray="3 3"
              label={{ 
                value: 'Live', 
                position: 'right', 
                fill: 'currentColor',
                fontSize: 10,
                offset: 10
              }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="absolute bottom-4 left-6 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Market Live</span>
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type PredictRequest, type PredictionResponse } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface PredictionUsage {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  plan: string;
}

// Hook to get prediction usage
export function usePredictionUsage() {
  return useQuery<PredictionUsage>({
    queryKey: ['/api/predictions/usage'],
    retry: false,
  });
}

export function usePrediction() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: PredictRequest) => {
      const res = await apiRequest("POST", api.prediction.analyze.path, data);
      if (!res.ok) {
        const error = await res.json();
        if (error.code === 'LIMIT_EXCEEDED') {
          throw new Error(`Daily limit reached (${error.limit}/day). Upgrade for more predictions.`);
        }
        throw new Error(error.message || 'Prediction failed');
      }
      return await res.json() as PredictionResponse & { usage?: PredictionUsage };
    },
    onSuccess: () => {
      // Invalidate usage query to refresh count
      queryClient.invalidateQueries({ queryKey: ['/api/predictions/usage'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Prediction Failed",
        description: error.message || "Could not analyze market data.",
        variant: "destructive",
      });
    },
  });
}

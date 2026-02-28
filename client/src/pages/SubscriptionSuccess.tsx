import { useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const { subscription, isLoading } = useSubscription();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center" data-testid="card-subscription-success">
          <CardContent className="py-10 space-y-6">
            {isLoading ? (
              <>
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Processing your subscription...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold">Welcome to {subscription?.plan || 'Premium'}!</h1>
                <p className="text-muted-foreground">
                  Your subscription is now active. You have full access to all the features
                  included in your plan.
                </p>
                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    onClick={() => setLocation("/")} 
                    data-testid="button-go-dashboard"
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation("/analysis")}
                    data-testid="button-start-analysis"
                  >
                    Start Analyzing Gold
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

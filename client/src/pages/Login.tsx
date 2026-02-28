import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Loader2, LogIn, ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectUrl = params.get('redirect') || '/dashboard';
  
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isActive, isLoading: subLoading } = useSubscription();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated and has active subscription, redirect to original destination or dashboard
  useEffect(() => {
    if (isAuthenticated && !authLoading && !subLoading && isActive) {
      setLocation(redirectUrl);
    }
  }, [isAuthenticated, authLoading, subLoading, isActive, redirectUrl, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, firstName, lastName });
      }
      // After successful login, redirect to the original destination or dashboard
      setLocation(redirectUrl);
    } catch (err: any) {
      // Parse error message and show user-friendly version
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (err?.message) {
        let msg = err.message.toLowerCase();
        
        // Try to extract JSON message from format like "401: {"message":"..."}"
        try {
          const jsonMatch = err.message.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.message) {
              msg = parsed.message.toLowerCase();
            }
          }
        } catch {
          // Use original message if JSON parsing fails
        }
        
        if (msg.includes('too many')) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else if (msg.includes('exists') || msg.includes('already')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (msg.includes('no account found')) {
          errorMessage = 'No account found with this email. Please check your email or create a new account.';
        } else if (msg.includes('incorrect password')) {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('email')) {
          errorMessage = 'Invalid email or password. Please try again.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      {/* Header */}
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
            data-testid="button-back-pricing"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {mode === 'login' 
                ? 'Sign in to access your Gold Predict dashboard' 
                : 'Complete your account setup after subscribing'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                data-testid="button-submit-auth"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button 
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-primary hover:underline"
                      data-testid="button-switch-register"
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button 
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-primary hover:underline"
                      data-testid="button-switch-login"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-border/40">
              <p className="text-xs text-muted-foreground text-center">
                Note: You need an active subscription to access the dashboard. 
                If you haven't subscribed yet,{' '}
                <button 
                  onClick={() => setLocation('/')}
                  className="text-primary hover:underline"
                >
                  choose a plan first
                </button>.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

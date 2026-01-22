
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('Attempting login with:', loginData.email);
    const result = await login(loginData.email, loginData.password);
    
    if (result.success) {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      navigate('/dashboard');
    } else {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid credentials",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const result = await signup({
      email: signupData.email,
      password: signupData.password,
      first_name: signupData.first_name,
      last_name: signupData.last_name
    });

    if (result.success) {
      toast({
        title: "Registration Successful",
        description: "You can now log in with your credentials",
      });
      setSignupData({
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: ''
      });
    } else {
      toast({
        title: "Registration Failed",
        description: result.error || "Registration failed",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0%,_hsl(var(--background))_45%)] px-4 py-10">
      <div className="container mx-auto">
        <div className="flex items-center justify-between pb-6 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <ThemeToggle />
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <img
                src="/utm-logo.png"
                alt="University of Technology, Mauritius"
                className="h-12 w-auto"
              />
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-primary/70">
                  University of Technology, Mauritius
                </p>
                <h1 className="text-2xl font-semibold text-primary">Helpdesk Service Portal</h1>
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              Sign in to access the institutional support hub, knowledge base, and service analytics.
            </p>
            <div className="grid gap-4 text-sm text-muted-foreground">
              <div className="rounded-lg border border-primary/10 bg-white/80 p-4">
                <p className="text-sm font-semibold text-primary">Secure Access</p>
                <p className="mt-1 text-xs">
                  Your credentials are protected and audited for compliance.
                </p>
              </div>
              <div className="rounded-lg border border-primary/10 bg-white/80 p-4">
                <p className="text-sm font-semibold text-primary">Quick Support</p>
                <p className="mt-1 text-xs">
                  Fast routing, automated knowledge, and transparent SLAs.
                </p>
              </div>
            </div>
          </div>

          <Card className="w-full border-primary/10 bg-white/95 shadow-lg animate-fade-up">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-2xl text-primary">Account Access</CardTitle>
              <CardDescription>Log in or request a new account.</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="h-11 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Demo credentials: admin@helpdesk.com / admin123
                  </p>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="first_name"
                      placeholder="John"
                      value={signupData.first_name}
                      onChange={(e) => setSignupData({ ...signupData, first_name: e.target.value })}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="last_name"
                      placeholder="Doe"
                      value={signupData.last_name}
                      onChange={(e) => setSignupData({ ...signupData, last_name: e.target.value })}
                      className="h-11"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup_email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signup_email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup_password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup_password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      className="h-11 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="Confirm your password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    className="h-11"
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;


import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { brandingConfig } from '@/config/branding';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0%,_hsl(var(--background))_45%)] text-foreground">
      <header className="border-b border-primary/10 bg-white/90 backdrop-blur animate-fade-in">
        <div className="container mx-auto flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
              <h1 className="text-lg font-semibold text-primary">
                {brandingConfig.productName}
              </h1>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            Access Portal
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-16">
        <section className="grid gap-10 pb-12 pt-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6 animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              Academic Service Desk
            </p>
            <h2 className="text-4xl font-semibold leading-tight text-primary md:text-5xl">
              Support services designed for a modern university.
            </h2>
            <p className="text-lg text-muted-foreground">
              {brandingConfig.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/auth')}>
                Sign In to Service Desk
              </Button>
              <Button variant="outline" size="lg">
                Explore Knowledge Base
              </Button>
            </div>
          </div>
          <Card className="border-primary/10 bg-white/95 animate-fade-up">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-primary">
                Quick Access
              </CardTitle>
              <CardDescription>
                Dedicated support for staff and students.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-primary/10 bg-muted/60 p-4">
                <p className="text-sm font-semibold text-primary">Demo Admin Access</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {brandingConfig.demoAdmin.email} / {brandingConfig.demoAdmin.password}
                </p>
              </div>
              <div className="grid gap-3 text-sm text-muted-foreground">
                {brandingConfig.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-3 animate-fade-up">
          {[
            {
              title: 'Structured Support',
              description: 'Route requests to the right department with clarity and accountability.',
            },
            {
              title: 'Knowledge-led Answers',
              description: 'AI-guided responses built around your institutional knowledge base.',
            },
            {
              title: 'Operational Transparency',
              description: 'Dashboards and analytics that keep teams aligned on service quality.',
            },
          ].map((item) => (
            <Card key={item.title} className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-xl text-primary">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Index;

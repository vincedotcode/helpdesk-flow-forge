
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Helpdesk Platform</CardTitle>
          <CardDescription className="text-lg">
            Professional support ticket management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Streamline your support operations with our comprehensive helpdesk solution.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>✓ Multi-role user management</p>
              <p>✓ Department-based organization</p>
              <p>✓ Advanced ticket tracking</p>
              <p>✓ Real-time collaboration</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
              size="lg"
            >
              Get Started
            </Button>
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Demo Admin: admin@helpdesk.com / admin123
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;

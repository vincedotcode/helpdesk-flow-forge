
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Ticket, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BroadcastNotifications from './BroadcastNotifications';
import DashboardBroadcastSection from './DashboardBroadcastSection';

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  urgentTickets: number;
  totalUsers: number;
  recentActivity: number;
}

const DashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    urgentTickets: 0,
    totalUsers: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch ticket stats
      const [totalTickets, openTickets, urgentTickets] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('priority', 'urgent')
      ]);

      // Fetch user stats (only for admins)
      let totalUsers = { count: 0 };
      if (user?.role === 'super_admin' || user?.role === 'department_admin') {
        totalUsers = await supabase.from('users').select('*', { count: 'exact', head: true });
      }

      // Fetch recent activity (tickets created in last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const recentActivity = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      setStats({
        totalTickets: totalTickets.count || 0,
        openTickets: openTickets.count || 0,
        urgentTickets: urgentTickets.count || 0,
        totalUsers: totalUsers.count || 0,
        recentActivity: recentActivity.count || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'department_admin':
        return 'Department Administrator';
      case 'department_technician':
        return 'Department Technician';
      case 'end_user':
        return 'End User';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg font-medium text-gray-600" role="status" aria-live="polite">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Section with Better Typography */}
      <header className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
          {getGreeting()}, {user?.first_name}
        </h1>
        <p className="text-lg text-gray-700 font-medium mb-3">
          Welcome to your Help Desk Dashboard
        </p>
        <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
          {getRoleDisplayName(user?.role || '')}
        </Badge>
      </header>

      {/* Improved Stats Grid with Better Typography */}
      <section aria-label="Dashboard Statistics">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Total Tickets
                  </p>
                  <p className="text-3xl font-bold text-gray-900" aria-label={`${stats.totalTickets} total tickets`}>
                    {stats.totalTickets}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Ticket className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Open Tickets
                  </p>
                  <p className="text-3xl font-bold text-gray-900" aria-label={`${stats.openTickets} open tickets`}>
                    {stats.openTickets}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Urgent Tickets
                  </p>
                  <p className="text-3xl font-bold text-red-600" aria-label={`${stats.urgentTickets} urgent tickets`}>
                    {stats.urgentTickets}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>

          {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
            <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      Total Users
                    </p>
                    <p className="text-3xl font-bold text-gray-900" aria-label={`${stats.totalUsers} total users`}>
                      {stats.totalUsers}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <Users className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Broadcast Section */}
      <DashboardBroadcastSection />

      {/* Personal Notifications */}
      <BroadcastNotifications />

      {/* Activity Section with Better Typography */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-3 text-gray-900">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            System Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-base font-medium text-gray-700">New tickets today</span>
              <Badge variant="secondary" className="text-base font-bold px-3 py-1">
                {stats.recentActivity}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-base font-medium text-gray-700">System Status</span>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true"></div>
                <span className="text-base font-semibold text-green-700">All Systems Operational</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions with Better Typography */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => navigate('/dashboard/tickets')}
              size="lg"
              className="font-semibold text-base px-6 py-3"
            >
              View All Tickets
            </Button>
            
            {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
              <>
                <Button 
                  onClick={() => navigate('/dashboard/analytics')}
                  variant="outline"
                  size="lg"
                  className="font-semibold text-base px-6 py-3"
                >
                  View Analytics
                </Button>
                
                <Button 
                  onClick={() => navigate('/dashboard/broadcasts')}
                  variant="outline"
                  size="lg"
                  className="font-semibold text-base px-6 py-3"
                >
                  Manage Broadcasts
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;

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
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Minimalistic Welcome Section */}
      <div className="border-l-4 border-l-blue-500 pl-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          {getGreeting()}, {user?.first_name}
        </h1>
        <p className="text-gray-600 mb-2">Welcome back to the Help Desk System</p>
        <Badge variant="outline" className="text-xs">
          {getRoleDisplayName(user?.role || '')}
        </Badge>
      </div>

      {/* Clean Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Tickets</p>
                <p className="text-2xl font-semibold">{stats.totalTickets}</p>
              </div>
              <Ticket className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Open Tickets</p>
                <p className="text-2xl font-semibold">{stats.openTickets}</p>
              </div>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Urgent Tickets</p>
                <p className="text-2xl font-semibold">{stats.urgentTickets}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-2xl font-semibold">{stats.totalUsers}</p>
                </div>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Broadcast Notifications Section */}
      <DashboardBroadcastSection />

      {/* Personal Notifications */}
      <BroadcastNotifications />

      {/* Simple Activity Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">New tickets (24h)</span>
            <Badge variant="secondary">{stats.recentActivity}</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">System Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Operational</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => navigate('/dashboard/tickets')}
              variant="outline"
              size="sm"
            >
              View Tickets
            </Button>
            
            {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
              <>
                <Button 
                  onClick={() => navigate('/dashboard/analytics')}
                  variant="outline"
                  size="sm"
                >
                  Analytics
                </Button>
                
                <Button 
                  onClick={() => navigate('/dashboard/broadcasts')}
                  variant="outline"
                  size="sm"
                >
                  Broadcasts
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

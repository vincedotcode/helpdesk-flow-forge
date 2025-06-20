
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Ticket, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BroadcastNotifications from './BroadcastNotifications';

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
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">
          {getGreeting()}, {user?.first_name}!
        </h1>
        <p className="text-blue-100">
          Welcome back to the Help Desk System • {getRoleDisplayName(user?.role || '')}
        </p>
      </div>

      {/* High Priority Broadcast Notifications */}
      <BroadcastNotifications showOnlyHigh={true} maxHeight="300px" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{stats.totalTickets}</p>
              </div>
              <Ticket className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                <p className="text-2xl font-bold">{stats.openTickets}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent Tickets</p>
                <p className="text-2xl font-bold">{stats.urgentTickets}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">New tickets created in the last 24 hours</p>
                <p className="text-sm text-muted-foreground">System activity monitoring</p>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {stats.recentActivity}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Broadcast Notifications */}
      <BroadcastNotifications />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => navigate('/dashboard/tickets')}
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              <Ticket className="w-6 h-6" />
              <span>View All Tickets</span>
            </Button>
            
            {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
              <>
                <Button 
                  onClick={() => navigate('/dashboard/analytics')}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                >
                  <TrendingUp className="w-6 h-6" />
                  <span>View Analytics</span>
                </Button>
                
                <Button 
                  onClick={() => navigate('/dashboard/broadcasts')}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                >
                  <Users className="w-6 h-6" />
                  <span>Manage Broadcasts</span>
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

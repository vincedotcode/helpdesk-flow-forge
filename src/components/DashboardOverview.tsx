
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Ticket, Clock, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BroadcastNotifications from './BroadcastNotifications';
import TicketNotifications from './TicketNotifications';
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
        <div className="text-lg font-medium text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {user?.first_name}
        </h1>
        <p className="text-muted-foreground">
          Welcome to your Help Desk Dashboard
        </p>
        <Badge variant="secondary" className="w-fit">
          {getRoleDisplayName(user?.role || '')}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              All tickets in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.urgentTickets}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Active users in system
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Broadcast Section */}
      <DashboardBroadcastSection />

      {/* Personal Notifications */}
      <BroadcastNotifications />
      <TicketNotifications />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            System Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">New tickets today</span>
            <Badge variant="outline">{stats.recentActivity}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">System Status</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Operational</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/dashboard/tickets')}>
              View All Tickets
            </Button>
            
            {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
              <>
                <Button 
                  onClick={() => navigate('/dashboard/analytics')}
                  variant="outline"
                >
                  View Analytics
                </Button>
                
                <Button 
                  onClick={() => navigate('/dashboard/broadcasts')}
                  variant="outline"
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

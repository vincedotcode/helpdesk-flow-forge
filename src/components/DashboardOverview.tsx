import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Ticket, Clock, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
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
      {/* Enhanced Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white rounded-xl p-8 shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <h1 className="text-3xl font-bold">
              {getGreeting()}, {user?.first_name}!
            </h1>
          </div>
          <p className="text-blue-100 text-lg mb-4">
            Welcome back to the Help Desk System
          </p>
          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/25">
            {getRoleDisplayName(user?.role || '')}
          </Badge>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Tickets</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTickets}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Ticket className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Open Tickets</p>
                <p className="text-3xl font-bold text-gray-900">{stats.openTickets}</p>
                <p className="text-xs text-gray-500 mt-1">Needs attention</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full -translate-y-8 translate-x-8"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Urgent Tickets</p>
                <p className="text-3xl font-bold text-gray-900">{stats.urgentTickets}</p>
                <p className="text-xs text-gray-500 mt-1">High priority</p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
          <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full -translate-y-8 translate-x-8"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-xs text-gray-500 mt-1">Active users</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Broadcast Notifications Section */}
      <DashboardBroadcastSection />

      {/* Personal Notifications (Keep existing) */}
      <BroadcastNotifications />

      {/* Enhanced Recent Activity */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="font-medium text-blue-900">New tickets created</p>
                <p className="text-sm text-blue-700">In the last 24 hours</p>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1 bg-blue-100 text-blue-800">
                {stats.recentActivity}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-green-900">System Status</p>
                <p className="text-sm text-green-700">All systems operational</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => navigate('/dashboard/tickets')}
              className="h-auto py-6 flex flex-col items-center gap-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Ticket className="w-8 h-8" />
              <span className="text-lg">View All Tickets</span>
            </Button>
            
            {(user?.role === 'super_admin' || user?.role === 'department_admin') && (
              <>
                <Button 
                  onClick={() => navigate('/dashboard/analytics')}
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-3 border-2 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100"
                >
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-lg">View Analytics</span>
                </Button>
                
                <Button 
                  onClick={() => navigate('/dashboard/broadcasts')}
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-3 border-2 hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100"
                >
                  <Users className="w-8 h-8" />
                  <span className="text-lg">Manage Broadcasts</span>
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

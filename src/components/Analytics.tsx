
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Ticket, MessageSquare, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  totalTickets: number;
  totalBroadcasts: number;
  ticketsByStatus: Array<{ name: string; value: number; color: string }>;
  ticketsByPriority: Array<{ name: string; value: number; color: string }>;
  broadcastsByImportance: Array<{ name: string; value: number; color: string }>;
  usersByRole: Array<{ name: string; value: number; color: string }>;
  ticketsOverTime: Array<{ date: string; count: number }>;
  departmentStats: Array<{ name: string; tickets: number; users: number }>;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch basic counts
      const [usersRes, ticketsRes, broadcastsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact' }),
        supabase.from('tickets').select('*', { count: 'exact' }),
        supabase.from('broadcasts').select('*', { count: 'exact' })
      ]);

      // Fetch tickets by status
      const { data: ticketsByStatus } = await supabase
        .from('tickets')
        .select('status')
        .not('status', 'is', null);

      // Fetch tickets by priority  
      const { data: ticketsByPriority } = await supabase
        .from('tickets')
        .select('priority')
        .not('priority', 'is', null);

      // Fetch broadcasts by importance
      const { data: broadcastsByImportance } = await supabase
        .from('broadcasts')
        .select('importance');

      // Fetch users by role
      const { data: usersByRole } = await supabase
        .from('users')
        .select('role');

      // Fetch tickets over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: ticketsOverTime } = await supabase
        .from('tickets')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fetch department stats
      const { data: departments } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          users(count),
          tickets(count)
        `);

      // Process data
      const statusCounts = ticketsByStatus?.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const priorityCounts = ticketsByPriority?.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {}) || {};

      const importanceCounts = broadcastsByImportance?.reduce((acc, broadcast) => {
        acc[broadcast.importance] = (acc[broadcast.importance] || 0) + 1;
        return acc;
      }, {}) || {};

      const roleCounts = usersByRole?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}) || {};

      // Process tickets over time
      const timeData = ticketsOverTime?.reduce((acc, ticket) => {
        const date = new Date(ticket.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};

      const analyticsData: AnalyticsData = {
        totalUsers: usersRes.count || 0,
        totalTickets: ticketsRes.count || 0,
        totalBroadcasts: broadcastsRes.count || 0,
        ticketsByStatus: Object.entries(statusCounts).map(([name, value]) => ({
          name: name.replace('_', ' ').toUpperCase(),
          value: value as number,
          color: getStatusColor(name)
        })),
        ticketsByPriority: Object.entries(priorityCounts).map(([name, value]) => ({
          name: name.toUpperCase(),
          value: value as number,
          color: getPriorityColor(name)
        })),
        broadcastsByImportance: Object.entries(importanceCounts).map(([name, value]) => ({
          name: name.toUpperCase(),
          value: value as number,
          color: getImportanceColor(name)
        })),
        usersByRole: Object.entries(roleCounts).map(([name, value]) => ({
          name: name.replace('_', ' ').toUpperCase(),
          value: value as number,
          color: getRoleColor(name)
        })),
        ticketsOverTime: Object.entries(timeData).map(([date, count]) => ({
          date,
          count: count as number
        })).slice(-14), // Last 14 days
        departmentStats: departments?.map(dept => ({
          name: dept.name,
          tickets: dept.tickets?.[0]?.count || 0,
          users: dept.users?.[0]?.count || 0
        })) || []
      };

      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: '#3b82f6',
      in_progress: '#f59e0b',
      resolved: '#10b981',
      closed: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };
    return colors[priority] || '#6b7280';
  };

  const getImportanceColor = (importance: string) => {
    const colors = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return colors[importance] || '#6b7280';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      super_admin: '#dc2626',
      department_admin: '#f59e0b',
      department_technician: '#10b981',
      end_user: '#3b82f6'
    };
    return colors[role] || '#6b7280';
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive analytics and insights for the help desk system
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{data.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{data.totalTickets}</p>
              </div>
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Broadcasts</p>
                <p className="text-2xl font-bold">{data.totalBroadcasts}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold text-green-600">Good</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.ticketsByStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.ticketsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.ticketsByPriority}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {data.ticketsByPriority.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tickets Over Time (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.ticketsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Broadcasts by Importance Level</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.broadcastsByImportance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {data.broadcastsByImportance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.usersByRole}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.usersByRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.departmentStats.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{dept.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {dept.users} users • {dept.tickets} tickets
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{dept.users} Users</Badge>
                      <Badge variant="outline">{dept.tickets} Tickets</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;

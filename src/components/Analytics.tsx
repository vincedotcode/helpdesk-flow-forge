
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Ticket, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Target,
  Award
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalTickets: number;
    totalBroadcasts: number;
    avgResolutionTime: number;
    userGrowth: number;
    ticketGrowth: number;
  };
  ticketMetrics: {
    byStatus: Array<{ name: string; value: number; color: string }>;
    byPriority: Array<{ name: string; value: number; color: string }>;
    byDepartment: Array<{ name: string; tickets: number; resolved: number; pending: number }>;
    resolutionTrend: Array<{ date: string; resolved: number; created: number }>;
    responseTime: Array<{ range: string; count: number }>;
  };
  userMetrics: {
    byRole: Array<{ name: string; value: number; color: string }>;
    activityTrend: Array<{ date: string; logins: number; tickets: number }>;
    departmentDistribution: Array<{ name: string; users: number; active: number }>;
  };
  broadcastMetrics: {
    byImportance: Array<{ name: string; value: number; color: string }>;
    engagement: Array<{ title: string; sent: number; read: number; engagement: number }>;
    audienceReach: Array<{ audience: string; count: number; percentage: number }>;
  };
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted))',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(startDate.getDate() - days);

      // Fetch basic counts
      const [usersRes, ticketsRes, broadcastsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact' }),
        supabase.from('tickets').select('*', { count: 'exact' }),
        supabase.from('broadcasts').select('*', { count: 'exact' })
      ]);

      // Fetch detailed ticket data
      const { data: ticketDetails } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch user data
      const { data: userDetails } = await supabase
        .from('users')
        .select('*, departments(name)');

      // Fetch broadcast data
      const { data: broadcastDetails } = await supabase
        .from('broadcasts')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Process ticket metrics
      const statusCounts = ticketDetails?.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const priorityCounts = ticketDetails?.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {}) || {};

      // Process user metrics
      const roleCounts = userDetails?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}) || {};

      // Process broadcast metrics
      const importanceCounts = broadcastDetails?.reduce((acc, broadcast) => {
        acc[broadcast.importance] = (acc[broadcast.importance] || 0) + 1;
        return acc;
      }, {}) || {};

      // Generate time series data
      const generateTimeSeriesData = (items: any[], days: number) => {
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString();
          
          const dayItems = items?.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate.toDateString() === date.toDateString();
          }) || [];

          data.push({
            date: dateStr,
            count: dayItems.length,
            resolved: dayItems.filter(item => item.status === 'resolved').length,
            created: dayItems.length
          });
        }
        return data;
      };

      const ticketTrend = generateTimeSeriesData(ticketDetails || [], days);

      const analyticsData: AnalyticsData = {
        overview: {
          totalUsers: usersRes.count || 0,
          totalTickets: ticketsRes.count || 0,
          totalBroadcasts: broadcastsRes.count || 0,
          avgResolutionTime: 2.4, // Mock data - would calculate from actual resolution times
          userGrowth: 12.5, // Mock data - would calculate from time comparison
          ticketGrowth: -5.2, // Mock data - would calculate from time comparison
        },
        ticketMetrics: {
          byStatus: Object.entries(statusCounts).map(([name, value]) => ({
            name: name.replace('_', ' ').toUpperCase(),
            value: value as number,
            color: name === 'resolved' ? COLORS.success : 
                   name === 'open' ? COLORS.warning : 
                   name === 'in_progress' ? COLORS.info : COLORS.muted
          })),
          byPriority: Object.entries(priorityCounts).map(([name, value]) => ({
            name: name.toUpperCase(),
            value: value as number,
            color: name === 'urgent' ? COLORS.destructive :
                   name === 'high' ? '#f97316' :
                   name === 'medium' ? COLORS.warning : COLORS.success
          })),
          byDepartment: [], // Would populate with actual department data
          resolutionTrend: ticketTrend,
          responseTime: [
            { range: '< 1 hour', count: 45 },
            { range: '1-4 hours', count: 32 },
            { range: '4-24 hours', count: 18 },
            { range: '> 24 hours', count: 5 }
          ]
        },
        userMetrics: {
          byRole: Object.entries(roleCounts).map(([name, value]) => ({
            name: name.replace('_', ' ').toUpperCase(),
            value: value as number,
            color: name === 'super_admin' ? COLORS.destructive :
                   name === 'department_admin' ? COLORS.warning :
                   name === 'department_technician' ? COLORS.info : COLORS.success
          })),
          activityTrend: [], // Would populate with actual activity data
          departmentDistribution: [] // Would populate with actual department data
        },
        broadcastMetrics: {
          byImportance: Object.entries(importanceCounts).map(([name, value]) => ({
            name: name.toUpperCase(),
            value: value as number,
            color: name === 'high' ? COLORS.destructive :
                   name === 'medium' ? COLORS.warning : COLORS.info
          })),
          engagement: [], // Would populate with actual engagement data
          audienceReach: [] // Would populate with actual audience data
        }
      };

      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalUsers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +{data.overview.userGrowth}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalTickets}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-600" />
              {Math.abs(data.overview.ticketGrowth)}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgResolutionTime}h</div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Broadcasts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalBroadcasts}</div>
            <p className="text-xs text-muted-foreground">
              Messages sent to users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Broadcasts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Tickets by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.ticketMetrics.byStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.ticketMetrics.byStatus.map((entry, index) => (
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
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tickets by Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.ticketMetrics.byPriority}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {data.ticketMetrics.byPriority.map((entry, index) => (
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
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ticket Resolution Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.ticketMetrics.resolutionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="created" 
                    stackId="1"
                    stroke={COLORS.info} 
                    fill={COLORS.info}
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resolved" 
                    stackId="2"
                    stroke={COLORS.success} 
                    fill={COLORS.success}
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Response Time Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.ticketMetrics.responseTime} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="range" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users by Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.userMetrics.byRole}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.userMetrics.byRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87.5%</div>
                <p className="text-xs text-muted-foreground">
                  Tickets resolved on time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.6/5</div>
                <p className="text-xs text-muted-foreground">
                  Average rating
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">First Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2h</div>
                <p className="text-xs text-muted-foreground">
                  Average first response
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="broadcasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Broadcasts by Importance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.broadcastMetrics.byImportance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.broadcastMetrics.byImportance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;

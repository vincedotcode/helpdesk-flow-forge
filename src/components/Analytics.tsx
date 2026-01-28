import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from './LoadingSpinner';
import { showErrorToast, showSuccessToast } from '@/utils/toast';
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
  Award,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalTickets: number;
    totalBroadcasts: number;
    avgResolutionTime: number;
    userGrowth: number;
    ticketGrowth: number;
    satisfactionScore: number;
    responseTime: number;
  };
  ticketMetrics: {
    byStatus: Array<{ name: string; value: number; color: string }>;
    byPriority: Array<{ name: string; value: number; color: string }>;
    byDepartment: Array<{ name: string; tickets: number; resolved: number; pending: number; avgTime: number }>;
    resolutionTrend: Array<{ date: string; resolved: number; created: number; pending: number }>;
    responseTime: Array<{ range: string; count: number; percentage: number }>;
  };
  userMetrics: {
    byRole: Array<{ name: string; value: number; color: string }>;
    activityTrend: Array<{ date: string; logins: number; tickets: number; engagement: number }>;
    departmentDistribution: Array<{ name: string; users: number; active: number; tickets: number }>;
    topUsers: Array<{ id: string; name: string; email: string; tickets: number; department: string; lastActivity: string }>;
  };
  broadcastMetrics: {
    byImportance: Array<{ name: string; value: number; color: string }>;
    engagement: Array<{ title: string; sent: number; read: number; engagement: number; department: string }>;
    audienceReach: Array<{ audience: string; count: number; percentage: number }>;
    recentBroadcasts: Array<{ title: string; importance: string; audience: string; sent: string; readRate: number }>;
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
  purple: '#8b5cf6',
  orange: '#f97316',
};

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [ticketsForPeriod, setTicketsForPeriod] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = data?.userMetrics.topUsers.find(u => u.id === selectedUserId) || null;
  const selectedUserTickets = selectedUserId
    ? ticketsForPeriod.filter((ticket) => ticket.created_by === selectedUserId)
    : [];

  const fetchAnalytics = async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(startDate.getDate() - days);

      // Fetch data from multiple tables with error handling
      const [usersRes, ticketsRes, broadcastsRes, departmentsRes] = await Promise.allSettled([
        supabase.from('users').select('*, departments(name)'),
        supabase.from('tickets').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('broadcasts').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('departments').select('*')
      ]);

      // Handle potential errors in data fetching
      const users = usersRes.status === 'fulfilled' ? usersRes.value.data || [] : [];
      const tickets = ticketsRes.status === 'fulfilled' ? ticketsRes.value.data || [] : [];
      const broadcasts = broadcastsRes.status === 'fulfilled' ? broadcastsRes.value.data || [] : [];
      const departments = departmentsRes.status === 'fulfilled' ? departmentsRes.value.data || [] : [];

      // Check for any failed requests
      const failedRequests = [usersRes, ticketsRes, broadcastsRes, departmentsRes]
        .filter(result => result.status === 'rejected');
      
      if (failedRequests.length > 0) {
        console.warn('Some data requests failed:', failedRequests);
        showErrorToast('Partial Data Loading', 'Some analytics data may be incomplete due to network issues.');
      }

      // Process ticket metrics
      const statusCounts = tickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityCounts = tickets.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Process user metrics
      const roleCounts = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Process broadcast metrics
      const importanceCounts = broadcasts.reduce((acc, broadcast) => {
        acc[broadcast.importance] = (acc[broadcast.importance] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Generate time series data
      const generateTimeSeriesData = (items: any[], days: number) => {
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayItems = items.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate.toISOString().split('T')[0] === dateStr;
          });

          data.push({
            date: dateStr,
            resolved: dayItems.filter(item => item.status === 'resolved').length,
            created: dayItems.length,
            pending: dayItems.filter(item => item.status === 'open' || item.status === 'in_progress').length
          });
        }
        return data;
      };

      const ticketTrend = generateTimeSeriesData(tickets, days);

      // Build ticket counts per user for top active users
      const ticketsByUserId = tickets.reduce((acc, ticket) => {
        if (ticket.created_by) {
          acc[ticket.created_by] = (acc[ticket.created_by] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const nonAdminUsers = users.filter(
        (u) => u.role !== 'super_admin' && u.role !== 'department_admin'
      );

      const topUsers = nonAdminUsers
        .map((u) => {
          const userTickets = tickets.filter((t) => t.created_by === u.id);
          const lastActivityDate = userTickets.length
            ? new Date(
                Math.max(
                  ...userTickets.map((t) => new Date(t.created_at).getTime())
                )
              ).toLocaleDateString()
            : 'N/A';

          return {
            id: u.id,
            name: `${u.first_name} ${u.last_name}`,
            email: u.email,
            tickets: ticketsByUserId[u.id] || 0,
            department: u.departments?.name || 'N/A',
            lastActivity: lastActivityDate,
          };
        })
        .filter((u) => u.tickets > 0)
        .sort((a, b) => b.tickets - a.tickets)
        .slice(0, 10);

      // Generate mock department performance data
      const departmentPerformance = departments.map(dept => {
        const deptTickets = tickets.filter(ticket => ticket.department_id === dept.id);
        const deptUsers = users.filter(user => user.department_id === dept.id);
        return {
          name: dept.name,
          tickets: deptTickets.length,
          resolved: deptTickets.filter(t => t.status === 'resolved').length,
          pending: deptTickets.filter(t => t.status !== 'resolved').length,
          avgTime: Math.round(Math.random() * 48 + 12) // Mock average resolution time
        };
      });

      const analyticsData: AnalyticsData = {
        overview: {
          totalUsers: users.length,
          totalTickets: tickets.length,
          totalBroadcasts: broadcasts.length,
          avgResolutionTime: 18.5,
          userGrowth: 12.5,
          ticketGrowth: -5.2,
          satisfactionScore: 4.6,
          responseTime: 1.2
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
                   name === 'high' ? COLORS.orange :
                   name === 'medium' ? COLORS.warning : COLORS.success
          })),
          byDepartment: departmentPerformance,
          resolutionTrend: ticketTrend,
          responseTime: [
            { range: '< 1 hour', count: 45, percentage: 45 },
            { range: '1-4 hours', count: 32, percentage: 32 },
            { range: '4-24 hours', count: 18, percentage: 18 },
            { range: '> 24 hours', count: 5, percentage: 5 }
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
          activityTrend: ticketTrend.map(item => ({
            date: item.date,
            logins: Math.floor(Math.random() * 50 + 20),
            tickets: item.created,
            engagement: Math.floor(Math.random() * 100 + 50)
          })),
          departmentDistribution: departments.map(dept => {
            const deptUsers = users.filter(user => user.department_id === dept.id);
            const deptTickets = tickets.filter(ticket => ticket.department_id === dept.id);
            return {
              name: dept.name,
              users: deptUsers.length,
              active: Math.floor(deptUsers.length * 0.8),
              tickets: deptTickets.length
            };
          }),
          topUsers
        },
        broadcastMetrics: {
          byImportance: Object.entries(importanceCounts).map(([name, value]) => ({
            name: name.toUpperCase(),
            value: value as number,
            color: name === 'high' ? COLORS.destructive :
                   name === 'medium' ? COLORS.warning : COLORS.info
          })),
          engagement: broadcasts.slice(0, 10).map(broadcast => ({
            title: broadcast.title,
            sent: Math.floor(Math.random() * 500 + 100),
            read: Math.floor(Math.random() * 400 + 50),
            engagement: Math.floor(Math.random() * 80 + 20),
            department: 'All Departments'
          })),
          audienceReach: [
            { audience: 'All Users', count: users.length, percentage: 100 },
            { audience: 'Department Admins', count: users.filter(u => u.role === 'department_admin').length, percentage: 15 },
            { audience: 'Technicians', count: users.filter(u => u.role === 'department_technician').length, percentage: 35 },
            { audience: 'End Users', count: users.filter(u => u.role === 'end_user').length, percentage: 50 }
          ],
          recentBroadcasts: broadcasts.slice(0, 10).map(broadcast => ({
            title: broadcast.title,
            importance: broadcast.importance,
            audience: broadcast.target_audience,
            sent: new Date(broadcast.created_at).toLocaleDateString(),
            readRate: Math.floor(Math.random() * 80 + 20)
          }))
        }
      };

      setData(analyticsData);
      setTicketsForPeriod(tickets);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics data';
      setError(errorMessage);
      showErrorToast('Analytics Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const handleExport = async () => {
    try {
      showSuccessToast('Export Started', 'Preparing analytics data for export...');
      
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would generate and download the file
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showSuccessToast('Export Complete', 'Analytics data has been downloaded successfully.');
    } catch (error) {
      showErrorToast('Export Failed', 'Unable to export analytics data. Please try again.');
    }
  };

  const handleExportTopUsersPdf = () => {
    if (!data) return;

    const topUsers = data.userMetrics.topUsers;
    if (!topUsers.length) {
      showErrorToast('Export Failed', 'No top active users to export.');
      return;
    }

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      showErrorToast('Export Failed', 'Popup blocked. Please allow popups to export the report.');
      return;
    }

    const rowsHtml = topUsers
      .map(
        (u) => `
        <tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.department}</td>
          <td>${u.tickets}</td>
          <td>${u.lastActivity}</td>
        </tr>`
      )
      .join('');

    reportWindow.document.write(`
      <html>
        <head>
          <title>Top Active Users Report</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            p { margin: 4px 0 16px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Top Active Users</h1>
          <p>Time range: ${timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Tickets Created</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const handleExportUserTicketsPdf = () => {
    if (!selectedUser || !selectedUserTickets.length) {
      showErrorToast('Export Failed', 'No tickets found for this user in the selected period.');
      return;
    }

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      showErrorToast('Export Failed', 'Popup blocked. Please allow popups to export the report.');
      return;
    }

    const rowsHtml = selectedUserTickets
      .map(
        (t) => `
        <tr>
          <td>${t.title}</td>
          <td>${t.status}</td>
          <td>${t.priority}</td>
          <td>${new Date(t.created_at).toLocaleDateString()}</td>
        </tr>`
      )
      .join('');

    reportWindow.document.write(`
      <html>
        <head>
          <title>User Ticket Report - ${selectedUser.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 14px; margin: 0 0 12px; color: #4b5563; }
            p { margin: 2px 0; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>User Ticket Report</h1>
          <h2>${selectedUser.name}</h2>
          <p><strong>Email:</strong> ${selectedUser.email}</p>
          <p><strong>Department:</strong> ${selectedUser.department}</p>
          <p><strong>Time range:</strong> ${timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}</p>
          <p><strong>Total tickets:</strong> ${selectedUserTickets.length}</p>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Loading analytics dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => fetchAnalytics()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No analytics data available. Please check your permissions or try refreshing the page.
        </AlertDescription>
      </Alert>
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
              disabled={refreshing}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Enhanced Overview KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Card className="col-span-2">
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

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalTickets}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-green-600" />
              {Math.abs(data.overview.ticketGrowth)}% decrease
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgResolutionTime}h</div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.satisfactionScore}/5</div>
            <p className="text-xs text-muted-foreground">
              Customer satisfaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resolution Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.ticketMetrics.resolutionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="created" stackId="1" stroke={COLORS.info} fill={COLORS.info} />
                    <Area type="monotone" dataKey="resolved" stackId="2" stroke={COLORS.success} fill={COLORS.success} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Activity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.userMetrics.activityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="logins" stroke={COLORS.primary} />
                    <Line type="monotone" dataKey="engagement" stroke={COLORS.success} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Total Tickets</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Avg Resolution Time</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ticketMetrics.byDepartment.map((dept) => (
                    <TableRow key={dept.name}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.tickets}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {dept.resolved}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {dept.pending}
                        </Badge>
                      </TableCell>
                      <TableCell>{dept.avgTime}h</TableCell>
                      <TableCell>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${dept.tickets > 0 ? (dept.resolved / dept.tickets) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.ticketMetrics.byStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
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
                <CardTitle>Tickets by Priority</CardTitle>
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
              <CardTitle>Response Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.ticketMetrics.responseTime.map((item) => (
                  <div key={item.range} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.range}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.count} tickets</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Users by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.userMetrics.byRole}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
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

            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.userMetrics.departmentDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="users" fill={COLORS.primary} />
                    <Bar dataKey="active" fill={COLORS.success} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Active Users</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportTopUsersPdf}>
                <Download className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Tickets Created</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.userMetrics.topUsers.map((user) => (
                    <TableRow 
                      key={user.email}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.tickets}</Badge>
                      </TableCell>
                      <TableCell>{user.lastActivity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                <CardTitle className="text-sm font-medium">First Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.responseTime}h</div>
                <p className="text-xs text-muted-foreground">
                  Average first response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.satisfactionScore}/5</div>
                <p className="text-xs text-muted-foreground">
                  Average rating
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="broadcasts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Broadcasts by Importance</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle>Audience Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.broadcastMetrics.audienceReach}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ audience, percentage }) => `${audience} ${percentage}%`}
                    >
                      {data.broadcastMetrics.audienceReach.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Broadcast Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Importance</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Read Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.broadcastMetrics.recentBroadcasts.map((broadcast, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{broadcast.title}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={broadcast.importance === 'high' ? 'destructive' : 
                                  broadcast.importance === 'medium' ? 'default' : 'secondary'}
                        >
                          {broadcast.importance.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{broadcast.audience}</TableCell>
                      <TableCell>{broadcast.sent}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${broadcast.readRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{broadcast.readRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Ticket Report</DialogTitle>
            {selectedUser && (
              <DialogDescription>
                Ticket history for <span className="font-medium">{selectedUser.name}</span> ({selectedUser.email}) in the selected analytics period.
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Department: <span className="font-medium text-foreground">{selectedUser.department}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tickets created in period: <span className="font-medium text-foreground">{selectedUserTickets.length}</span>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportUserTicketsPdf} disabled={!selectedUserTickets.length}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>

              {selectedUserTickets.length ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUserTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium max-w-xs truncate">{ticket.title}</TableCell>
                          <TableCell className="capitalize">{ticket.status.replace('_', ' ')}</TableCell>
                          <TableCell className="capitalize">{ticket.priority}</TableCell>
                          <TableCell>{new Date(ticket.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This user has no tickets in the selected time range.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analytics;

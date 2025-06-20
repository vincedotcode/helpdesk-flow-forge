
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Mail, 
  Database, 
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const SettingsPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Profile settings state
  const [profileSettings, setProfileSettings] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    ticketUpdates: true,
    broadcastMessages: true,
    systemAlerts: true,
    weeklyReports: false
  });

  // System settings state (for admins)
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    allowRegistration: true,
    sessionTimeout: '30',
    maxFileSize: '10',
    supportEmail: 'support@company.com',
    companyName: 'Helpdesk Pro'
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notifications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystem = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "System Settings Updated",
        description: "System configuration has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update system settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              System
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileSettings.firstName}
                    onChange={(e) => setProfileSettings({...profileSettings, firstName: e.target.value})}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileSettings.lastName}
                    onChange={(e) => setProfileSettings({...profileSettings, lastName: e.target.value})}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileSettings.email}
                  onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
                  placeholder="Enter your email"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Badge variant={user?.is_active ? "default" : "secondary"}>
                  {user?.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button onClick={handleSaveProfile} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={profileSettings.currentPassword}
                  onChange={(e) => setProfileSettings({...profileSettings, currentPassword: e.target.value})}
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={profileSettings.newPassword}
                    onChange={(e) => setProfileSettings({...profileSettings, newPassword: e.target.value})}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={profileSettings.confirmPassword}
                    onChange={(e) => setProfileSettings({...profileSettings, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about important updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, emailNotifications: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in browser
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, pushNotifications: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Ticket Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when tickets are updated
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.ticketUpdates}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, ticketUpdates: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Broadcast Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive system-wide announcements
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.broadcastMessages}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, broadcastMessages: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">System Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Important system maintenance and security alerts
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemAlerts}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, systemAlerts: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary of your activity
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.weeklyReports}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, weeklyReports: checked})
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <h3 className="font-medium">Account Status</h3>
                    </div>
                    <p className="text-sm text-green-700">Your account is secure and active</p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <Key className="w-5 h-5" />
                      <h3 className="font-medium">Last Password Change</h3>
                    </div>
                    <p className="text-sm text-blue-700">30 days ago</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Session Management</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-muted-foreground">Chrome on Windows • Active now</p>
                    </div>
                    <Badge>Current</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Mobile App</p>
                      <p className="text-sm text-muted-foreground">iOS • Last active 2 hours ago</p>
                    </div>
                    <Button variant="outline" size="sm">Revoke</Button>
                  </div>
                </div>
              </div>

              <Button variant="destructive" className="w-full">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Sign Out All Devices
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Manage system-wide settings and configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={systemSettings.companyName}
                      onChange={(e) => setSystemSettings({...systemSettings, companyName: e.target.value})}
                      placeholder="Enter company name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={systemSettings.supportEmail}
                      onChange={(e) => setSystemSettings({...systemSettings, supportEmail: e.target.value})}
                      placeholder="Enter support email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Select
                      value={systemSettings.sessionTimeout}
                      onValueChange={(value) => setSystemSettings({...systemSettings, sessionTimeout: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                    <Select
                      value={systemSettings.maxFileSize}
                      onValueChange={(value) => setSystemSettings({...systemSettings, maxFileSize: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select file size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 MB</SelectItem>
                        <SelectItem value="10">10 MB</SelectItem>
                        <SelectItem value="25">25 MB</SelectItem>
                        <SelectItem value="50">50 MB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">System Controls</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable to prevent new user access during maintenance
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={(checked) => 
                        setSystemSettings({...systemSettings, maintenanceMode: checked})
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Allow Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register accounts
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.allowRegistration}
                      onCheckedChange={(checked) => 
                        setSystemSettings({...systemSettings, allowRegistration: checked})
                      }
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSystem} disabled={loading} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save System Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPanel;


import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import { brandingConfig } from '@/config/branding';
import { 
  LayoutDashboard, 
  Users, 
  Building, 
  Ticket, 
  Settings, 
  LogOut,
  BarChart3,
  BookOpen,
  MessageCircle,
  Megaphone
} from 'lucide-react';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { user, logout } = useAuth();

  const canManageUsers = user?.role === 'super_admin' || user?.role === 'department_admin';
  const canManageDepartments = user?.role === 'super_admin';
  const canManageKnowledge = user?.role === 'super_admin';
  const canCreateBroadcasts = user?.role === 'super_admin' || user?.role === 'department_admin';

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      value: 'dashboard',
      show: true,
    },
    {
      title: 'Analytics',
      icon: BarChart3,
      value: 'analytics',
      show: true,
    },
    {
      title: 'Tickets',
      icon: Ticket,
      value: 'tickets',
      show: true,
    },
    {
      title: 'Ticket Assistant',
      icon: MessageCircle,
      value: 'knowledge-chat',
      show: true,
    },
    {
      title: 'Knowledge Base',
      icon: BookOpen,
      value: 'knowledge',
      show: canManageKnowledge,
    },
    {
      title: 'Broadcasts',
      icon: Megaphone,
      value: 'broadcasts',
      show: canCreateBroadcasts,
    },
    {
      title: 'Departments',
      icon: Building,
      value: 'departments',
      show: canManageDepartments,
    },
    {
      title: 'Users',
      icon: Users,
      value: 'users',
      show: canManageUsers,
    },
    {
      title: 'Settings',
      icon: Settings,
      value: 'settings',
      show: true,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-col gap-3 p-3">
          <div className="relative rounded-lg bg-sidebar-accent/40 p-3">
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-sidebar-primary" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/utm-logo.png"
                  alt="University of Technology, Mauritius"
                  className="h-10 w-auto"
                />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/60">
                    University of Technology, Mauritius
                  </p>
                  <h2 className="text-base font-semibold text-sidebar-foreground">
                    {brandingConfig.productName}
                  </h2>
                </div>
              </div>
              <NotificationBell />
            </div>
          </div>
          <div className="rounded-lg border border-sidebar-border/60 bg-sidebar/40 px-3 py-2">
            <div className="text-sm text-sidebar-foreground">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-sidebar-foreground/60 capitalize">
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter(item => item.show)
                .map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.value}
                      onClick={() => onTabChange(item.value)}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between p-2 gap-2">
          <ThemeToggle />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="flex-1"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

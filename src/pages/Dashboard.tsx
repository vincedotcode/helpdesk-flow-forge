
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import DashboardOverview from '@/components/DashboardOverview';
import EnhancedUserManagement from '@/components/EnhancedUserManagement';
import DepartmentManagement from '@/components/DepartmentManagement';
import TicketManagement from '@/components/TicketManagement';
import KnowledgeManagement from '@/components/KnowledgeManagement';
import KnowledgeBaseChat from '@/components/KnowledgeBaseChat';
import BroadcastManagement from '@/components/BroadcastManagement';
import SettingsPanel from '@/components/SettingsPanel';
import Analytics from '@/components/Analytics';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useLocation, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const availableTabs = useMemo(() => new Set([
    'dashboard',
    'analytics',
    'tickets',
    'departments',
    'users',
    'knowledge',
    'knowledge-chat',
    'broadcasts',
    'settings',
  ]), []);

  const resolveTabFromLocation = useCallback((pathname: string, search: string) => {
    const queryTab = new URLSearchParams(search).get('tab');
    if (queryTab && availableTabs.has(queryTab)) return queryTab;

    const pathSegment = pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean)[0];
    if (pathSegment && availableTabs.has(pathSegment)) return pathSegment;

    return 'dashboard';
  }, [availableTabs]);

  const [activeTab, setActiveTab] = useState(() => resolveTabFromLocation(location.pathname, location.search));

  useEffect(() => {
    const nextTab = resolveTabFromLocation(location.pathname, location.search);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [location.pathname, location.search, activeTab, resolveTabFromLocation]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const targetPath = tab === 'dashboard' ? '/dashboard' : `/dashboard/${tab}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'analytics':
        return <Analytics />;
      case 'tickets':
        return <TicketManagement />;
      case 'departments':
        return <DepartmentManagement />;
      case 'users':
        return <EnhancedUserManagement />;
      case 'knowledge':
        return <KnowledgeManagement />;
      case 'knowledge-chat':
        return <KnowledgeBaseChat />;
      case 'broadcasts':
        return <BroadcastManagement />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <DashboardOverview />;
    }
  };

  const getBreadcrumbs = () => {
    const breadcrumbMap: Record<string, string> = {
      dashboard: 'Dashboard',
      analytics: 'Analytics',
      tickets: 'Tickets',
      departments: 'Departments',
      users: 'Users',
      knowledge: 'Knowledge Management',
      'knowledge-chat': 'Ticket Assistant',
      broadcasts: 'Broadcasts',
      settings: 'Settings',
    };

    return breadcrumbMap[activeTab] || 'Dashboard';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <SidebarInset>
          <header className="relative flex h-16 shrink-0 items-center gap-2 border-b border-primary/20 bg-primary text-primary-foreground shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1 text-primary-foreground hover:bg-white/10" />
              <Separator orientation="vertical" className="mr-2 h-4 bg-white/30" />
              <Breadcrumb>
                <BreadcrumbList className="text-primary-foreground">
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#" className="text-primary-foreground/80 hover:text-primary-foreground">
                      University Service Desk
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block text-primary-foreground/60" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-primary-foreground">{getBreadcrumbs()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0%,_hsl(var(--background))_55%)]">
            <div className="container mx-auto p-6">
              {renderContent()}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;

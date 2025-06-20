
import React, { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import DashboardOverview from '@/components/DashboardOverview';
import EnhancedUserManagement from '@/components/EnhancedUserManagement';
import DepartmentManagement from '@/components/DepartmentManagement';
import TicketManagement from '@/components/TicketManagement';
import KnowledgeManagement from '@/components/KnowledgeManagement';
import KnowledgeBaseChat from '@/components/KnowledgeBaseChat';
import BroadcastManagement from '@/components/BroadcastManagement';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'analytics':
        return <DashboardOverview />;
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
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">
                Configure your helpdesk system preferences
              </p>
            </div>
            <div className="text-center py-12">
              <p className="text-muted-foreground">Settings panel coming soon...</p>
            </div>
          </div>
        );
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
      'knowledge-chat': 'AI Assistant',
      broadcasts: 'Broadcasts',
      settings: 'Settings',
    };

    return breadcrumbMap[activeTab] || 'Dashboard';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">
                      Helpdesk
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getBreadcrumbs()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
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


import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from '@/components/UserManagement';
import DepartmentManagement from '@/components/DepartmentManagement';
import TicketManagement from '@/components/TicketManagement';
import { LogOut, Users, Building, Ticket } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = () => {
    logout();
  };

  const canManageUsers = user.role === 'super_admin' || user.role === 'department_admin';
  const canManageDepartments = user.role === 'super_admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Helpdesk Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome, {user.first_name} {user.last_name} ({user.role.replace('_', ' ')})
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tickets">
                <Ticket className="w-4 h-4 mr-2" />
                Tickets
              </TabsTrigger>
              {canManageDepartments && (
                <TabsTrigger value="departments">
                  <Building className="w-4 h-4 mr-2" />
                  Departments
                </TabsTrigger>
              )}
              {canManageUsers && (
                <TabsTrigger value="users">
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="tickets" className="mt-6">
              <TicketManagement />
            </TabsContent>

            {canManageDepartments && (
              <TabsContent value="departments" className="mt-6">
                <DepartmentManagement />
              </TabsContent>
            )}

            {canManageUsers && (
              <TabsContent value="users" className="mt-6">
                <UserManagement />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

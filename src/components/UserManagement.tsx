
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department_id?: string;
  is_active: boolean;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

type UserRole = 'super_admin' | 'department_admin' | 'department_technician' | 'end_user';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'end_user' as UserRole,
    department_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          department_id,
          is_active,
          created_at,
          departments(name)
        `)
        .order('created_at', { ascending: false });

      // Department admins can only see users in their department
      if (user?.role === 'department_admin' && user.department_id) {
        query = query.eq('department_id', user.department_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Use any type for RPC call to bypass TypeScript strict checking
      const result = await (supabase as any).rpc('create_user_by_admin', {
        user_email: newUser.email,
        user_password: newUser.password,
        user_first_name: newUser.first_name,
        user_last_name: newUser.last_name,
        user_role: newUser.role,
        user_department_id: newUser.department_id || null,
        created_by_id: user?.id || ''
      });
      
      const { data, error } = result as { data: any; error: any };

      if (error) throw error;

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setNewUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'end_user' as UserRole,
        department_id: ''
      });
      setIsAddDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const getRoleOptions = () => {
    if (user?.role === 'super_admin') {
      return [
        { value: 'end_user', label: 'End User' },
        { value: 'department_technician', label: 'Department Technician' },
        { value: 'department_admin', label: 'Department Admin' },
        { value: 'super_admin', label: 'Super Admin' }
      ];
    } else if (user?.role === 'department_admin') {
      return [
        { value: 'end_user', label: 'End User' },
        { value: 'department_technician', label: 'Department Technician' }
      ];
    }
    return [];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage users and their roles</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRoleOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={newUser.department_id} onValueChange={(value) => setNewUser({ ...newUser, department_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddUser} disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Role</th>
                <th className="text-left p-2">Department</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-2">{user.first_name} {user.last_name}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2 capitalize">{user.role.replace('_', ' ')}</td>
                  <td className="p-2">{user.department_id ? 'Assigned' : 'None'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;

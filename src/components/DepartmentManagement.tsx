
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Users } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface DepartmentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department_id?: string | null;
  is_active: boolean;
}

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState<Department | null>(null);
  const [departmentUsers, setDepartmentUsers] = useState<DepartmentUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<DepartmentUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: ''
  });

  const [editDepartment, setEditDepartment] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      });
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.name.trim()) {
      toast({
        title: "Error",
        description: "Department name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('departments')
        .insert({
          name: newDepartment.name.trim(),
          description: newDepartment.description.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department created successfully",
      });

      setNewDepartment({ name: '', description: '' });
      setIsAddDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error creating department:', error);
      toast({
        title: "Error",
        description: "Failed to create department",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setEditDepartment({
      name: department.name,
      description: department.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment) return;

    if (!editDepartment.name.trim()) {
      toast({
        title: "Error",
        description: "Department name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('departments')
        .update({
          name: editDepartment.name.trim(),
          description: editDepartment.description.trim() || null
        })
        .eq('id', editingDepartment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingDepartment(null);
      fetchDepartments();
    } catch (error) {
      console.error('Error updating department:', error);
      toast({
        title: "Error",
        description: "Failed to update department",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentNameById = (departmentId?: string | null) => {
    if (!departmentId) return 'No Department';
    return departments.find((dept) => dept.id === departmentId)?.name || 'Unknown';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'department_admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'department_technician':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'end_user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const loadDepartmentUsers = async (departmentId: string) => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, department_id, is_active')
        .order('first_name');

      if (error) throw error;

      const allUsers = data || [];
      setDepartmentUsers(allUsers.filter((user) => user.department_id === departmentId));
      setAvailableUsers(allUsers.filter((user) => user.department_id !== departmentId));
    } catch (error) {
      console.error('Error fetching department users:', error);
      toast({
        title: "Error",
        description: "Failed to load department users",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const openUsersDialog = async (department: Department) => {
    setActiveDepartment(department);
    setSelectedUserId('');
    setIsUsersDialogOpen(true);
    await loadDepartmentUsers(department.id);
  };

  const handleAddUserToDepartment = async () => {
    if (!activeDepartment || !selectedUserId) return;

    setUsersLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ department_id: activeDepartment.id })
        .eq('id', selectedUserId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User added to department",
      });

      setSelectedUserId('');
      await loadDepartmentUsers(activeDepartment.id);
    } catch (error) {
      console.error('Error adding user to department:', error);
      toast({
        title: "Error",
        description: "Failed to add user to department",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRemoveUserFromDepartment = async (user: DepartmentUser) => {
    if (!activeDepartment) return;

    if (user.role === 'department_admin' || user.role === 'department_technician') {
      toast({
        title: "Action blocked",
        description: "Admins and technicians must belong to a department. Use User Management to reassign their role or department.",
        variant: "destructive",
      });
      return;
    }

    setUsersLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ department_id: null })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed from department",
      });

      await loadDepartmentUsers(activeDepartment.id);
    } catch (error) {
      console.error('Error removing user from department:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from department",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!confirm('Are you sure you want to delete this department? This will affect all users and tickets assigned to it.')) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', departmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department deleted successfully",
      });
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: "Error",
        description: "Failed to delete department",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Department Management</CardTitle>
          <CardDescription>Manage departments and organizational structure</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
              <DialogDescription>Create a new department</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  placeholder="e.g., IT Support, HR, Sales"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                  placeholder="Brief description of the department's role"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddDepartment} disabled={loading}>
                {loading ? 'Creating...' : 'Create Department'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <Card key={department.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{department.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUsersDialog(department)}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(department)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteDepartment(department.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  {department.description || 'No description provided'}
                </p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(department.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        {departments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No departments created yet</p>
          </div>
        )}
      </CardContent>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingDepartment(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name</Label>
              <Input
                id="edit-name"
                value={editDepartment.name}
                onChange={(e) => setEditDepartment({ ...editDepartment, name: e.target.value })}
                placeholder="Department name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDepartment.description}
                onChange={(e) => setEditDepartment({ ...editDepartment, description: e.target.value })}
                placeholder="Brief description of the department's role"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDepartment} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUsersDialogOpen}
        onOpenChange={(open) => {
          setIsUsersDialogOpen(open);
          if (!open) {
            setActiveDepartment(null);
            setDepartmentUsers([]);
            setAvailableUsers([]);
            setSelectedUserId('');
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Department Users</DialogTitle>
            <DialogDescription>
              {activeDepartment ? `Assign users to ${activeDepartment.name}` : 'Assign users to department'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="department-users">Available Users</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="department-users">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers
                      .filter((user) => user.is_active)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} • {user.role.replace('_', ' ')} • {getDepartmentNameById(user.department_id)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {availableUsers.filter((user) => user.is_active).length === 0 && (
                  <p className="text-sm text-muted-foreground">No available users to assign.</p>
                )}
              </div>
              <Button
                onClick={handleAddUserToDepartment}
                disabled={usersLoading || !selectedUserId || !activeDepartment}
              >
                {usersLoading ? 'Adding...' : 'Add User'}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Current Members</h4>
                <span className="text-xs text-muted-foreground">
                  {departmentUsers.length} user{departmentUsers.length === 1 ? '' : 's'}
                </span>
              </div>

              {departmentUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">No users assigned to this department yet.</p>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {departmentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getRoleBadgeColor(user.role)} border-0`}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveUserFromDepartment(user)}
                        disabled={usersLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUsersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DepartmentManagement;

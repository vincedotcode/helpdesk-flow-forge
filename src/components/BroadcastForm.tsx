
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Department } from '@/hooks/useBroadcasts';

interface BroadcastFormProps {
  departments: Department[];
  onSubmit: (data: {
    title: string;
    message: string;
    target_audience: string;
    target_department_id?: string;
    importance: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

const BroadcastForm: React.FC<BroadcastFormProps> = ({
  departments,
  onSubmit,
  onCancel,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_audience: user?.role === 'department_admin' ? 'department_specific' : '',
    target_department_id: user?.role === 'department_admin' ? user.department_id || '' : '',
    importance: 'medium',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim() || !formData.target_audience) {
      return;
    }

    setLoading(true);
    
    const submitData = {
      ...formData,
      target_department_id: formData.target_audience === 'department_specific' 
        ? formData.target_department_id 
        : undefined,
    };

    const result = await onSubmit(submitData);
    
    if (result.success) {
      setFormData({
        title: '',
        message: '',
        target_audience: user?.role === 'department_admin' ? 'department_specific' : '',
        target_department_id: user?.role === 'department_admin' ? user.department_id || '' : '',
        importance: 'medium',
      });
      onCancel();
    }
    
    setLoading(false);
  };

  const getAudienceOptions = () => {
    const options = [];
    
    if (user?.role === 'super_admin') {
      options.push(
        { value: 'all_users', label: 'All Users' },
        { value: 'department_admin', label: 'Department Administrators' },
        { value: 'department_technician', label: 'Department Technicians' },
        { value: 'department_specific', label: 'Specific Department' }
      );
    } else if (user?.role === 'department_admin') {
      options.push(
        { value: 'department_specific', label: 'My Department' }
      );
    }
    
    return options;
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Broadcast</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter broadcast title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter your broadcast message"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="importance">Importance Level</Label>
            <Select
              value={formData.importance}
              onValueChange={(value) => setFormData({ ...formData, importance: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select importance level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <span className={getImportanceColor('low')}>🔵 Low Priority</span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className={getImportanceColor('medium')}>🟡 Medium Priority</span>
                </SelectItem>
                <SelectItem value="high">
                  <span className={getImportanceColor('high')}>🔴 High Priority</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Select
              value={formData.target_audience}
              onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
              required
              disabled={user?.role === 'department_admin'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                {getAudienceOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.target_audience === 'department_specific' && user?.role === 'super_admin' && (
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.target_department_id}
                onValueChange={(value) => setFormData({ ...formData, target_department_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.target_audience === 'department_specific' && user?.role === 'department_admin' && (
            <div className="space-y-2">
              <Label>Department</Label>
              <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                Broadcast will be sent to your department only
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Broadcast'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BroadcastForm;

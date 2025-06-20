
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  created_by: string;
  target_audience: 'all_users' | 'department_admin' | 'department_technician' | 'department_specific';
  target_department_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator?: {
    first_name: string;
    last_name: string;
  };
  department?: {
    name: string;
  };
}

export interface Department {
  id: string;
  name: string;
}

export const useBroadcasts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBroadcasts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('broadcasts')
        .select(`
          *,
          creator:created_by(first_name, last_name),
          department:target_department_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type the data properly to match our Broadcast interface
      const typedBroadcasts: Broadcast[] = (data || []).map(item => ({
        ...item,
        target_audience: item.target_audience as Broadcast['target_audience'],
        creator: Array.isArray(item.creator) ? item.creator[0] : item.creator,
        department: Array.isArray(item.department) ? item.department[0] : item.department
      }));
      
      setBroadcasts(typedBroadcasts);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch broadcasts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const createBroadcast = async (broadcastData: {
    title: string;
    message: string;
    target_audience: string;
    target_department_id?: string;
  }) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    try {
      const { error } = await supabase.from('broadcasts').insert({
        ...broadcastData,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Broadcast created successfully",
      });
      
      await fetchBroadcasts();
      return { success: true };
    } catch (error) {
      console.error('Error creating broadcast:', error);
      toast({
        title: "Error",
        description: "Failed to create broadcast",
        variant: "destructive",
      });
      return { success: false, error: 'Failed to create broadcast' };
    }
  };

  const deleteBroadcast = async (broadcastId: string) => {
    try {
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', broadcastId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Broadcast deleted successfully",
      });
      
      await fetchBroadcasts();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      toast({
        title: "Error",
        description: "Failed to delete broadcast",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchBroadcasts();
      fetchDepartments();
    }
  }, [user?.id]);

  return {
    broadcasts,
    departments,
    loading,
    createBroadcast,
    deleteBroadcast,
    fetchBroadcasts,
  };
};

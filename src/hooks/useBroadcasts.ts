
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  created_by: string;
  target_audience: 'all_users' | 'department_admin' | 'department_technician' | 'department_specific';
  target_department_id?: string;
  importance: 'low' | 'medium' | 'high';
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
      
      // Fetch broadcasts with creator and department info
      const { data: broadcastsData, error: broadcastsError } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (broadcastsError) throw broadcastsError;

      // Fetch creators info separately
      const creatorIds = [...new Set(broadcastsData?.map(b => b.created_by) || [])];
      const { data: creatorsData } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', creatorIds);

      // Fetch departments info separately
      const departmentIds = [...new Set(broadcastsData?.filter(b => b.target_department_id).map(b => b.target_department_id) || [])];
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);

      // Combine the data
      const enrichedBroadcasts: Broadcast[] = (broadcastsData || []).map(broadcast => ({
        ...broadcast,
        target_audience: broadcast.target_audience as Broadcast['target_audience'],
        creator: creatorsData?.find(c => c.id === broadcast.created_by),
        department: departmentsData?.find(d => d.id === broadcast.target_department_id)
      }));
      
      setBroadcasts(enrichedBroadcasts);
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
    importance: string;
  }) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    try {
      console.log('Creating broadcast with data:', broadcastData);
      console.log('Current user:', user);
      
      const { data, error } = await supabase.rpc('create_broadcast_with_user', {
        p_user_id: user.id,
        p_title: broadcastData.title,
        p_message: broadcastData.message,
        p_target_audience: broadcastData.target_audience,
        p_target_department_id: broadcastData.target_department_id || null,
        p_importance: broadcastData.importance
      });

      console.log('Broadcast creation result:', { data, error });

      if (error) {
        console.error('Broadcast creation error:', error);
        throw error;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        if (result.success) {
          toast({
            title: "Success",
            description: "Broadcast created successfully and notifications sent to users",
          });
          
          await fetchBroadcasts();
          return { success: true };
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to create broadcast",
            variant: "destructive",
          });
          return { success: false, error: result.message };
        }
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      console.error('Error creating broadcast:', error);
      toast({
        title: "Error",
        description: `Failed to create broadcast: ${error.message}`,
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


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DashboardBroadcast {
  id: string;
  title: string;
  message: string;
  importance: 'low' | 'medium' | 'high';
  created_at: string;
  target_audience: string;
  creator_name: string;
  department_name: string;
}

export const useDashboardBroadcasts = () => {
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState<DashboardBroadcast[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardBroadcasts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_active_broadcasts_for_dashboard');

      if (error) throw error;

      const broadcasts: DashboardBroadcast[] = (data || []).map((item: any) => ({
        ...item,
        importance: item.importance as 'low' | 'medium' | 'high'
      }));
      
      setBroadcasts(broadcasts);
    } catch (error) {
      console.error('Error fetching dashboard broadcasts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch broadcasts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardBroadcasts();
  }, []);

  return {
    broadcasts,
    loading,
    fetchDashboardBroadcasts
  };
};

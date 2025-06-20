
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DashboardBroadcast } from '@/hooks/useDashboardBroadcasts';

interface DashboardBroadcastCardProps {
  broadcast: DashboardBroadcast;
  minimal?: boolean;
}

const getImportanceColor = (importance: string) => {
  switch (importance) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getAudienceLabel = (audience: string, departmentName?: string) => {
  switch (audience) {
    case 'all_users':
      return 'All Users';
    case 'department_admin':
      return 'Admins';
    case 'department_technician':
      return 'Technicians';
    case 'department_specific':
      return departmentName || 'Department';
    default:
      return 'Unknown';
  }
};

const DashboardBroadcastCard: React.FC<DashboardBroadcastCardProps> = ({ 
  broadcast, 
  minimal = false 
}) => {
  if (minimal) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {broadcast.title}
              </h4>
              <Badge 
                variant="outline" 
                className={`text-xs ${getImportanceColor(broadcast.importance)}`}
              >
                {broadcast.importance}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {broadcast.message}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {getAudienceLabel(broadcast.target_audience, broadcast.department_name)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-900 truncate flex-1">
              {broadcast.title}
            </h3>
            <Badge 
              variant="outline" 
              className={`text-xs ml-2 ${getImportanceColor(broadcast.importance)}`}
            >
              {broadcast.importance}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2">
            {broadcast.message}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {getAudienceLabel(broadcast.target_audience, broadcast.department_name)}
              </div>
            </div>
            {broadcast.creator_name && (
              <span className="text-xs text-gray-500">
                {broadcast.creator_name}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardBroadcastCard;


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
      return 'bg-red-100 text-red-800 border-red-300 font-bold';
    case 'medium':
      return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-300 font-medium';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300 font-medium';
  }
};

const getAudienceLabel = (audience: string, departmentName?: string) => {
  switch (audience) {
    case 'all_users':
      return 'All Users';
    case 'department_admin':
      return 'Administrators';
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
      <article className="border-2 border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-base text-gray-900 truncate">
                {broadcast.title}
              </h3>
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-1 ${getImportanceColor(broadcast.importance)}`}
                aria-label={`Priority: ${broadcast.importance}`}
              >
                {broadcast.importance.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2 mb-3 font-medium leading-relaxed">
              {broadcast.message}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">
                  {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">
                  {getAudienceLabel(broadcast.target_audience, broadcast.department_name)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow border-2 border-gray-100">
      <CardContent className="p-6">
        <article className="space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-lg text-gray-900 truncate flex-1">
              {broadcast.title}
            </h3>
            <Badge 
              variant="outline" 
              className={`text-sm ml-3 px-3 py-1 ${getImportanceColor(broadcast.importance)}`}
              aria-label={`Priority: ${broadcast.importance}`}
            >
              {broadcast.importance.toUpperCase()}
            </Badge>
          </div>
          
          <p className="text-base text-gray-700 line-clamp-2 font-medium leading-relaxed">
            {broadcast.message}
          </p>
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">
                  {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">
                  {getAudienceLabel(broadcast.target_audience, broadcast.department_name)}
                </span>
              </div>
            </div>
            {broadcast.creator_name && (
              <span className="text-sm text-gray-600 font-medium">
                By {broadcast.creator_name}
              </span>
            )}
          </div>
        </article>
      </CardContent>
    </Card>
  );
};

export default DashboardBroadcastCard;

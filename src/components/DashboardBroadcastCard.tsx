
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DashboardBroadcast } from '@/hooks/useDashboardBroadcasts';

interface DashboardBroadcastCardProps {
  broadcast: DashboardBroadcast;
}

const getImportanceStyle = (importance: string) => {
  switch (importance) {
    case 'high':
      return {
        cardClass: 'border-red-200 bg-red-50/50 hover:bg-red-50',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        icon: '🚨'
      };
    case 'medium':
      return {
        cardClass: 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⚠️'
      };
    case 'low':
      return {
        cardClass: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: 'ℹ️'
      };
    default:
      return {
        cardClass: 'border-gray-200 bg-gray-50/50 hover:bg-gray-50',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '📢'
      };
  }
};

const getAudienceLabel = (audience: string, departmentName?: string) => {
  switch (audience) {
    case 'all_users':
      return 'All Users';
    case 'department_admin':
      return 'Department Admins';
    case 'department_technician':
      return 'Department Technicians';
    case 'department_specific':
      return departmentName || 'Specific Department';
    default:
      return 'Unknown';
  }
};

const DashboardBroadcastCard: React.FC<DashboardBroadcastCardProps> = ({ broadcast }) => {
  const style = getImportanceStyle(broadcast.importance);

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${style.cardClass}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-lg">{style.icon}</span>
              <h3 className="font-semibold text-gray-900 truncate">{broadcast.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`text-xs ${style.badgeClass}`}>
                {broadcast.importance.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
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
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {broadcast.creator_name}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardBroadcastCard;

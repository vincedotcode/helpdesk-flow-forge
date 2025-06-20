
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

const getImportanceBadge = (importance: string) => {
  switch (importance) {
    case 'high':
      return { variant: 'destructive' as const, label: 'HIGH' };
    case 'medium':
      return { variant: 'secondary' as const, label: 'MEDIUM' };
    case 'low':
      return { variant: 'outline' as const, label: 'LOW' };
    default:
      return { variant: 'outline' as const, label: 'UNKNOWN' };
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
  const importanceBadge = getImportanceBadge(broadcast.importance);

  if (minimal) {
    return (
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold leading-tight flex-1">
                {broadcast.title}
              </h3>
              <Badge variant={importanceBadge.variant} className="text-xs">
                {importanceBadge.label}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {broadcast.message}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>
                  {getAudienceLabel(broadcast.target_audience, broadcast.department_name)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-lg flex-1">
              {broadcast.title}
            </h3>
            <Badge variant={importanceBadge.variant}>
              {importanceBadge.label}
            </Badge>
          </div>
          
          <p className="text-muted-foreground">
            {broadcast.message}
          </p>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {getAudienceLabel(broadcast.target_audience, broadcast.department_name)}
                </span>
              </div>
            </div>
            {broadcast.creator_name && (
              <span className="font-medium">
                By {broadcast.creator_name}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardBroadcastCard;

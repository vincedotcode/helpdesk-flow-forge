
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone } from 'lucide-react';
import { useDashboardBroadcasts } from '@/hooks/useDashboardBroadcasts';
import DashboardBroadcastCard from './DashboardBroadcastCard';

const DashboardBroadcastSection: React.FC = () => {
  const { broadcasts, loading } = useDashboardBroadcasts();

  const highPriorityBroadcasts = broadcasts.filter(b => b.importance === 'high');
  const recentBroadcasts = broadcasts.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-50 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* High Priority Broadcasts - Minimal Alert Style */}
      {highPriorityBroadcasts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <span className="text-base">🚨</span>
              High Priority
              <Badge variant="destructive" className="text-xs">
                {highPriorityBroadcasts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {highPriorityBroadcasts.slice(0, 2).map((broadcast) => (
                <DashboardBroadcastCard key={broadcast.id} broadcast={broadcast} minimal />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Announcements - Clean List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-gray-500" />
            Announcements
            {broadcasts.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {broadcasts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {broadcasts.length === 0 ? (
            <div className="text-center py-6">
              <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No announcements yet</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-2">
                {recentBroadcasts.map((broadcast) => (
                  <DashboardBroadcastCard key={broadcast.id} broadcast={broadcast} minimal />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardBroadcastSection;

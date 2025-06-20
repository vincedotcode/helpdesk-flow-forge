
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone, AlertTriangle } from 'lucide-react';
import { useDashboardBroadcasts } from '@/hooks/useDashboardBroadcasts';
import DashboardBroadcastCard from './DashboardBroadcastCard';

const DashboardBroadcastSection: React.FC = () => {
  const { broadcasts, loading } = useDashboardBroadcasts();

  const highPriorityBroadcasts = broadcasts.filter(b => b.importance === 'high');
  const recentBroadcasts = broadcasts.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* High Priority Broadcasts */}
      {highPriorityBroadcasts.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              High Priority Announcements
              <Badge variant="destructive" className="ml-auto">
                {highPriorityBroadcasts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {highPriorityBroadcasts.slice(0, 2).map((broadcast) => (
                <DashboardBroadcastCard key={broadcast.id} broadcast={broadcast} minimal />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Announcements */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Recent Announcements
            {broadcasts.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {broadcasts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {broadcasts.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No announcements</h3>
              <p className="text-sm text-muted-foreground">Check back later for updates</p>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-3">
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

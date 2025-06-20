
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
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-label="Broadcast Announcements">
      {/* High Priority Broadcasts */}
      {highPriorityBroadcasts.length > 0 && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-3 text-red-800">
              <div className="text-2xl" aria-hidden="true">🚨</div>
              <span>High Priority Announcements</span>
              <Badge variant="destructive" className="text-sm font-bold px-3 py-1">
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
      <Card className="border-2 border-gray-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-3 text-gray-900">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Megaphone className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <span>Recent Announcements</span>
            {broadcasts.length > 0 && (
              <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                {broadcasts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {broadcasts.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Megaphone className="w-8 h-8 text-gray-400" aria-hidden="true" />
              </div>
              <p className="text-lg font-medium text-gray-600">No announcements available</p>
              <p className="text-sm text-gray-500 mt-1">Check back later for updates</p>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-3 pr-2">
                {recentBroadcasts.map((broadcast) => (
                  <DashboardBroadcastCard key={broadcast.id} broadcast={broadcast} minimal />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default DashboardBroadcastSection;

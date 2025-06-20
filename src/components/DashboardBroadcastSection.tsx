
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone, Sparkles } from 'lucide-react';
import { useDashboardBroadcasts } from '@/hooks/useDashboardBroadcasts';
import DashboardBroadcastCard from './DashboardBroadcastCard';

const DashboardBroadcastSection: React.FC = () => {
  const { broadcasts, loading } = useDashboardBroadcasts();

  const highPriorityBroadcasts = broadcasts.filter(b => b.importance === 'high');
  const otherBroadcasts = broadcasts.filter(b => b.importance !== 'high');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
        <div className="h-48 bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* High Priority Broadcasts */}
      {highPriorityBroadcasts.length > 0 && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-red-100/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Sparkles className="w-5 h-5" />
              High Priority Announcements
              <Badge variant="destructive" className="text-xs">
                {highPriorityBroadcasts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {highPriorityBroadcasts.slice(0, 3).map((broadcast) => (
                <DashboardBroadcastCard key={broadcast.id} broadcast={broadcast} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Broadcasts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            Recent Announcements
            {broadcasts.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {broadcasts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {broadcasts.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
              <p className="text-gray-500">
                Stay tuned for updates and important announcements from your organization.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="grid gap-3 pr-4">
                {broadcasts.map((broadcast) => (
                  <DashboardBroadcastCard key={broadcast.id} broadcast={broadcast} />
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

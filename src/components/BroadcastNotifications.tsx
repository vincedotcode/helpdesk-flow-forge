
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone, Check, CheckCheck } from 'lucide-react';
import { useBroadcastNotifications } from '@/hooks/useBroadcastNotifications';
import { formatDistanceToNow } from 'date-fns';

const getImportanceColor = (importance: string) => {
  switch (importance) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getImportanceIcon = (importance: string) => {
  switch (importance) {
    case 'high':
      return '🚨';
    case 'medium':
      return '⚠️';
    case 'low':
      return 'ℹ️';
    default:
      return '📢';
  }
};

interface BroadcastNotificationsProps {
  showOnlyHigh?: boolean;
  maxHeight?: string;
}

const BroadcastNotifications: React.FC<BroadcastNotificationsProps> = ({ 
  showOnlyHigh = false, 
  maxHeight = "400px" 
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useBroadcastNotifications();

  const filteredNotifications = showOnlyHigh 
    ? notifications.filter(n => n.importance === 'high')
    : notifications;

  if (filteredNotifications.length === 0) {
    return null;
  }

  return (
    <Card className={showOnlyHigh ? 'border-red-200 bg-red-50' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            {showOnlyHigh ? 'High Priority Broadcasts' : 'Broadcast Notifications'}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {!showOnlyHigh && unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-2 p-6 pt-0">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getImportanceIcon(notification.importance)}</span>
                      <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                      <Badge className={`text-xs ${getImportanceColor(notification.importance)}`}>
                        {notification.importance.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(notification.broadcast_created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default BroadcastNotifications;

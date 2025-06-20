
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Megaphone, Users, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBroadcasts, Broadcast } from '@/hooks/useBroadcasts';
import BroadcastForm from './BroadcastForm';

const BroadcastManagement: React.FC = () => {
  const { user } = useAuth();
  const { broadcasts, departments, loading, createBroadcast, deleteBroadcast } = useBroadcasts();
  const [showForm, setShowForm] = useState(false);

  const canCreateBroadcast = user?.role === 'super_admin' || user?.role === 'department_admin';

  const getAudienceLabel = (broadcast: Broadcast) => {
    switch (broadcast.target_audience) {
      case 'all_users':
        return 'All Users';
      case 'department_admin':
        return 'Department Admins';
      case 'department_technician':
        return 'Department Technicians';
      case 'department_specific':
        return broadcast.department?.name || 'Specific Department';
      default:
        return 'Unknown';
    }
  };

  const getAudienceBadgeVariant = (audience: string) => {
    switch (audience) {
      case 'all_users':
        return 'default';
      case 'department_admin':
        return 'secondary';
      case 'department_technician':
        return 'outline';
      case 'department_specific':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (showForm) {
    return (
      <BroadcastForm
        departments={departments}
        onSubmit={createBroadcast}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Broadcast Management</h1>
          <p className="text-muted-foreground">
            Send announcements and updates to users across the system
          </p>
        </div>
        {canCreateBroadcast && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Broadcast
          </Button>
        )}
      </div>

      {!canCreateBroadcast && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <Megaphone className="w-5 h-5" />
              <p className="font-medium">
                You don't have permission to create broadcasts. Only super admins and department admins can create broadcasts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Recent Broadcasts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading broadcasts...</div>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No broadcasts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first broadcast to start communicating with users.
              </p>
              {canCreateBroadcast && (
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Broadcast
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {broadcasts.map((broadcast) => (
                  <Card key={broadcast.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {broadcast.title}
                            </h3>
                            <Badge variant={getAudienceBadgeVariant(broadcast.target_audience)}>
                              <Users className="w-3 h-3 mr-1" />
                              {getAudienceLabel(broadcast)}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground leading-relaxed">
                            {broadcast.message}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(broadcast.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {broadcast.creator && (
                              <div>
                                By {broadcast.creator.first_name} {broadcast.creator.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {(user?.role === 'super_admin' || broadcast.created_by === user?.id) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Broadcast</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this broadcast? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBroadcast(broadcast.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcastManagement;

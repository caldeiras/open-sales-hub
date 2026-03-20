import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks/usePlaybookData';
import { Bell, BellOff, CheckCheck, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function AlertsPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const { data: alerts = [], isLoading } = useAlerts(showUnreadOnly);
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();

  const typeIcons: Record<string, any> = {
    sla_violation: <AlertTriangle className="h-4 w-4 text-destructive" />,
    sla_escalation: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    opp_stale: <Clock className="h-4 w-4 text-yellow-500" />,
  };

  const typeLabels: Record<string, string> = {
    sla_violation: 'SLA Violado',
    sla_escalation: 'Escalação SLA',
    opp_stale: 'Oportunidade Parada',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
          <p className="text-sm text-muted-foreground">Notificações inteligentes de SLA e follow-up</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowUnreadOnly(!showUnreadOnly)}>
            {showUnreadOnly ? <Bell className="h-4 w-4 mr-1" /> : <BellOff className="h-4 w-4 mr-1" />}
            {showUnreadOnly ? 'Não lidos' : 'Todos'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutateAsync().then(() => toast.success('Todos marcados como lidos'))}>
            <CheckCheck className="h-4 w-4 mr-1" /> Marcar todos
          </Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : alerts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum alerta {showUnreadOnly ? 'não lido' : ''}.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert: any) => (
            <Card key={alert.id} className={`transition-colors ${!alert.read ? 'border-primary/30 bg-primary/5' : ''}`}>
              <CardContent className="flex items-start gap-3 py-3">
                <div className="mt-0.5">{typeIcons[alert.type] || <Bell className="h-4 w-4" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <Badge variant="outline" className="text-xs">{typeLabels[alert.type] || alert.type}</Badge>
                  </div>
                  {alert.message && <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                </div>
                {!alert.read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead.mutateAsync(alert.id)}>
                    Marcar lido
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

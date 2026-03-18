import { useActivities } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';

export default function ActivitiesPage() {
  const { data: activities = [], isLoading } = useActivities();

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => ({
    all: activities,
    pending: activities.filter((a: any) => a.status !== 'completed' && (!a.due_date || a.due_date >= today)),
    overdue: activities.filter((a: any) => a.status !== 'completed' && a.due_date && a.due_date < today),
    completed: activities.filter((a: any) => a.status === 'completed'),
  }), [activities, today]);

  const columns: Column<any>[] = [
    { key: 'title', header: 'Atividade', sortable: true, render: (item) => <span className="font-medium">{item.title}</span> },
    { key: 'activity_type', header: 'Tipo' },
    { key: 'priority', header: 'Prioridade', render: (item) => item.priority ? <StatusBadge status={item.priority} /> : '—' },
    { key: 'opportunity', header: 'Oportunidade', render: (item) => item.opportunity?.title || '—' },
    { key: 'due_date', header: 'Prazo', sortable: true, render: (item) => {
      if (!item.due_date) return '—';
      const isOverdue = item.due_date < today && item.status !== 'completed';
      return <span className={isOverdue ? 'text-destructive font-semibold' : ''}>{new Date(item.due_date).toLocaleDateString('pt-BR')}</span>;
    }},
    { key: 'status', header: 'Status', render: (item) => {
      const isOverdue = item.due_date && item.due_date < today && item.status !== 'completed';
      return <StatusBadge status={isOverdue ? 'overdue' : item.status} />;
    }},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
          <p className="text-sm text-muted-foreground">Gestão de tarefas e follow-ups</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Atividade</Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="all">Todas ({filtered.all.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({filtered.pending.length})</TabsTrigger>
          <TabsTrigger value="overdue" className="text-destructive">Vencidas ({filtered.overdue.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídas ({filtered.completed.length})</TabsTrigger>
        </TabsList>
        {(['all', 'pending', 'overdue', 'completed'] as const).map(tab => (
          <TabsContent key={tab} value={tab}>
            <DataTable data={filtered[tab]} columns={columns} searchKeys={['title']} searchPlaceholder="Buscar atividades..." loading={isLoading} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

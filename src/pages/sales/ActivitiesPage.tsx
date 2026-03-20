import { useState, useMemo } from 'react';
import { useActivities, useUpsertActivity, useAccounts, useOpportunities, useContacts } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil } from 'lucide-react';

export default function ActivitiesPage() {
  const { data: activities = [], isLoading } = useActivities();
  const upsert = useUpsertActivity();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Only load dropdown data when dialog is open to avoid unnecessary 403s
  const { data: accounts = [] } = useAccounts(dialogOpen ? undefined : { _skip: 'true' });
  const { data: opportunities = [] } = useOpportunities(dialogOpen ? undefined : { _skip: 'true' });
  const { data: contacts = [] } = useContacts(dialogOpen ? undefined : { _skip: 'true' });

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setDialogOpen(true); };

  const now = new Date().toISOString();

  const filtered = useMemo(() => ({
    all: activities,
    pending: activities.filter((a: any) => a.status === 'pending' && (!a.due_at || a.due_at >= now)),
    overdue: activities.filter((a: any) => a.status === 'pending' && a.due_at && a.due_at < now),
    completed: activities.filter((a: any) => a.status === 'completed'),
  }), [activities, now]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      activity_type: fd.get('activity_type'),
      subject: fd.get('subject'),
      description: fd.get('description') || null,
      account_id: fd.get('account_id') || null,
      opportunity_id: fd.get('opportunity_id') || null,
      contact_id: fd.get('contact_id') || null,
      due_at: fd.get('due_at') ? new Date(fd.get('due_at') as string).toISOString() : null,
      status: fd.get('status') || 'pending',
    };
    if (editing?.id) payload.id = editing.id;

    try {
      await upsert.mutateAsync(payload);
      toast({ title: editing ? 'Atividade atualizada' : 'Atividade criada' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const columns: Column<any>[] = [
    { key: 'subject', header: 'Atividade', sortable: true, render: (item) => <span className="font-medium">{item.subject}</span> },
    { key: 'activity_type', header: 'Tipo' },
    { key: 'account', header: 'Empresa', render: (item) => item.account?.name || '—' },
    { key: 'opportunity', header: 'Oportunidade', render: (item) => item.opportunity?.title || '—' },
    { key: 'due_at', header: 'Prazo', sortable: true, render: (item) => {
      if (!item.due_at) return '—';
      const isOverdue = item.due_at < now && item.status !== 'completed';
      return <span className={isOverdue ? 'text-destructive font-semibold' : ''}>{new Date(item.due_at).toLocaleDateString('pt-BR')}</span>;
    }},
    { key: 'status', header: 'Status', render: (item) => {
      const isOverdue = item.due_at && item.due_at < now && item.status !== 'completed';
      return <StatusBadge status={isOverdue ? 'overdue' : item.status} />;
    }},
    { key: 'actions', header: '', className: 'w-10', render: (item) => (
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )},
  ];

  const dueAtDefault = editing?.due_at ? new Date(editing.due_at).toISOString().slice(0, 16) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
          <p className="text-sm text-muted-foreground">Gestão de tarefas e follow-ups</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Atividade</Button>
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
            <DataTable data={filtered[tab]} columns={columns} searchKeys={['subject']} searchPlaceholder="Buscar atividades..." loading={isLoading} />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="subject">Assunto *</Label>
                <Input id="subject" name="subject" required defaultValue={editing?.subject || ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select name="activity_type" required defaultValue={editing?.activity_type || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due_at">Prazo</Label>
                <Input id="due_at" name="due_at" type="datetime-local" defaultValue={dueAtDefault} />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Select name="account_id" defaultValue={editing?.account_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Oportunidade</Label>
                <Select name="opportunity_id" defaultValue={editing?.opportunity_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {opportunities.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contato</Label>
                <Select name="contact_id" defaultValue={editing?.contact_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status || 'pending'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" rows={2} defaultValue={editing?.description || ''} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

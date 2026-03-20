import { useState } from 'react';
import { useOpportunities, useUpsertOpportunity, useAccounts, usePipelineStages, useLossReasons } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge, StageBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OpportunitiesPage() {
  const { data: opportunities = [], isLoading } = useOpportunities();
  const { data: accounts = [] } = useAccounts();
  const { data: stages = [] } = usePipelineStages();
  const { data: lossReasons = [] } = useLossReasons();
  const upsert = useUpsertOpportunity();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setDialogOpen(true); };

  const formatCurrency = (v: number) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      account_id: fd.get('account_id'),
      title: fd.get('title'),
      pipeline_stage_id: fd.get('pipeline_stage_id'),
      amount: fd.get('amount') ? Number(fd.get('amount')) : null,
      monthly_value: fd.get('monthly_value') ? Number(fd.get('monthly_value')) : null,
      close_date: fd.get('close_date') || null,
      status: fd.get('status') || 'open',
      temperature: fd.get('temperature') || null,
      loss_reason_id: fd.get('loss_reason_id') || null,
      notes: fd.get('notes') || null,
    };
    if (editing?.id) payload.id = editing.id;

    try {
      await upsert.mutateAsync(payload);
      toast({ title: editing ? 'Oportunidade atualizada' : 'Oportunidade criada' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const columns: Column<any>[] = [
    { key: 'title', header: 'Oportunidade', sortable: true, render: (item) => <span className="font-medium">{item.title}</span> },
    { key: 'account', header: 'Empresa', render: (item) => item.account?.name || '—', sortable: true },
    { key: 'stage', header: 'Etapa', render: (item) => item.stage ? <StageBadge stage={item.stage.stage_name} color={item.stage.color} /> : '—' },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    { key: 'amount', header: 'Valor', render: (item) => formatCurrency(item.amount), className: 'text-right' },
    { key: 'monthly_value', header: 'MRR', render: (item) => formatCurrency(item.monthly_value), className: 'text-right' },
    { key: 'close_date', header: 'Previsão', sortable: true, render: (item) => item.close_date ? new Date(item.close_date).toLocaleDateString('pt-BR') : '—' },
    { key: 'actions', header: '', className: 'w-10', render: (item) => (
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Oportunidades</h1>
          <p className="text-sm text-muted-foreground">Centro de execução comercial</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Oportunidade</Button>
      </div>
      <DataTable data={opportunities} columns={columns} searchKeys={['title']} searchPlaceholder="Buscar oportunidades..." onRowClick={(item) => navigate(`/opportunities/${item.id}`)} loading={isLoading} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" name="title" required defaultValue={editing?.title || ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa *</Label>
                <Select name="account_id" required defaultValue={editing?.account_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Etapa *</Label>
                <Select name="pipeline_stage_id" required defaultValue={editing?.pipeline_stage_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.stage_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Valor total</Label>
                <Input id="amount" name="amount" type="number" step="0.01" defaultValue={editing?.amount || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly_value">Valor mensal</Label>
                <Input id="monthly_value" name="monthly_value" type="number" step="0.01" defaultValue={editing?.monthly_value || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="close_date">Previsão de fechamento</Label>
                <Input id="close_date" name="close_date" type="date" defaultValue={editing?.close_date || ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status || 'open'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberta</SelectItem>
                    <SelectItem value="won">Ganha</SelectItem>
                    <SelectItem value="lost">Perdida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Temperatura</Label>
                <Select name="temperature" defaultValue={editing?.temperature || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Fria</SelectItem>
                    <SelectItem value="warm">Morna</SelectItem>
                    <SelectItem value="hot">Quente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Motivo de perda</Label>
                <Select name="loss_reason_id" defaultValue={editing?.loss_reason_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {lossReasons.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.reason_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={editing?.notes || ''} />
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

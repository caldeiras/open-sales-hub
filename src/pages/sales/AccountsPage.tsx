import { useState } from 'react';
import { useAccounts, useUpsertAccount, useSegments, useLeadSources } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil } from 'lucide-react';

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: segments = [] } = useSegments();
  const { data: sources = [] } = useLeadSources();
  const upsert = useUpsertAccount();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setDialogOpen(true); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      name: fd.get('name'),
      legal_name: fd.get('legal_name') || null,
      document_number: fd.get('document_number') || null,
      website: fd.get('website') || null,
      segment_id: fd.get('segment_id') || null,
      lead_source_id: fd.get('lead_source_id') || null,
      status: fd.get('status') || 'active',
      notes: fd.get('notes') || null,
    };
    if (editing?.id) payload.id = editing.id;

    try {
      await upsert.mutateAsync(payload);
      toast({ title: editing ? 'Empresa atualizada' : 'Empresa criada' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Empresa', sortable: true, render: (item) => <span className="font-medium">{item.name}</span> },
    { key: 'legal_name', header: 'Razão Social', sortable: true },
    { key: 'document_number', header: 'CNPJ' },
    { key: 'segment', header: 'Segmento', render: (item) => item.segment?.segment_name || '—' },
    { key: 'source', header: 'Origem', render: (item) => item.source?.source_name || '—' },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
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
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">Contas e empresas clientes</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Empresa</Button>
      </div>
      <DataTable data={accounts} columns={columns} searchKeys={['name', 'legal_name', 'document_number']} searchPlaceholder="Buscar empresas..." loading={isLoading} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" required defaultValue={editing?.name || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="legal_name">Razão Social</Label>
                <Input id="legal_name" name="legal_name" defaultValue={editing?.legal_name || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="document_number">CNPJ</Label>
                <Input id="document_number" name="document_number" defaultValue={editing?.document_number || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={editing?.website || ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Segmento</Label>
                <Select name="segment_id" defaultValue={editing?.segment_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {segments.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.segment_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select name="lead_source_id" defaultValue={editing?.lead_source_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.source_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status || 'active'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="prospect">Prospecto</SelectItem>
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

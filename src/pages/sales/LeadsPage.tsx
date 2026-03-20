import { useState } from 'react';
import { useLeads, useUpsertLead } from '@/hooks/useSalesData';
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

export default function LeadsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const upsert = useUpsertLead();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setDialogOpen(true); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      company_name: fd.get('company_name') || null,
      contact_name: fd.get('contact_name') || null,
      contact_email: fd.get('contact_email') || null,
      contact_phone: fd.get('contact_phone') || null,
      status: fd.get('status') || 'new',
      temperature: fd.get('temperature') || null,
      source: fd.get('source') || null,
      notes: fd.get('notes') || null,
    };
    if (editing?.id) payload.id = editing.id;

    try {
      await upsert.mutateAsync(payload);
      toast({ title: editing ? 'Lead atualizado' : 'Lead criado' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const columns: Column<any>[] = [
    { key: 'company_name', header: 'Empresa', sortable: true, render: (item) => <span className="font-medium">{item.company_name || '—'}</span> },
    { key: 'contact_name', header: 'Contato', sortable: true },
    { key: 'contact_email', header: 'E-mail' },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    { key: 'temperature', header: 'Temperatura', render: (item) => item.temperature ? <StatusBadge status={item.temperature} /> : '—' },
    { key: 'created_at', header: 'Criado em', sortable: true, render: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '—' },
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
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de leads comerciais</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Lead
        </Button>
      </div>

      <DataTable
        data={leads}
        columns={columns}
        searchKeys={['company_name', 'contact_name', 'contact_email']}
        searchPlaceholder="Buscar leads..."
        onRowClick={(item) => openEdit(item)}
        loading={isLoading}
        emptyMessage="Nenhum lead encontrado"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company_name">Empresa *</Label>
                <Input id="company_name" name="company_name" required defaultValue={editing?.company_name || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Contato</Label>
                <Input id="contact_name" name="contact_name" defaultValue={editing?.contact_name || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_email">E-mail</Label>
                <Input id="contact_email" name="contact_email" type="email" defaultValue={editing?.contact_email || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input id="contact_phone" name="contact_phone" defaultValue={editing?.contact_phone || ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status || 'new'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="contacted">Contatado</SelectItem>
                    <SelectItem value="qualified">Qualificado</SelectItem>
                    <SelectItem value="converted">Convertido</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Temperatura</Label>
                <Select name="temperature" defaultValue={editing?.temperature || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Frio</SelectItem>
                    <SelectItem value="warm">Morno</SelectItem>
                    <SelectItem value="hot">Quente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Origem</Label>
                <Select name="source" defaultValue={editing?.source || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="partner">Parceiro</SelectItem>
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

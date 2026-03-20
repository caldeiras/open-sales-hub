import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePlaybooks, useUpsertPlaybook, usePlaybookSteps, useUpsertPlaybookSteps } from '@/hooks/usePlaybookData';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { Plus, BookOpen, ChevronRight, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export default function PlaybooksPage() {
  const { data: playbooks = [], isLoading } = usePlaybooks();
  const upsertPlaybook = useUpsertPlaybook();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', description: '', segment: '', active: true });

  const handleSave = async () => {
    if (!form.name) { toast.error('Nome obrigatório'); return; }
    try {
      await upsertPlaybook.mutateAsync({ ...form, id: editingId || undefined });
      toast.success(editingId ? 'Playbook atualizado' : 'Playbook criado');
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', description: '', segment: '', active: true });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = (pb: any) => {
    setForm({ name: pb.name, description: pb.description || '', segment: pb.segment || '', active: pb.active });
    setEditingId(pb.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Playbooks</h1>
          <p className="text-sm text-muted-foreground">Cadências comerciais automatizadas</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', segment: '', active: true }); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Playbook
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Novo'} Playbook</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Textarea placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Segmento (opcional)" value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })} />
            <Button className="w-full" onClick={handleSave} disabled={upsertPlaybook.isPending}>
              {upsertPlaybook.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Playbook List */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : playbooks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum playbook criado ainda.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((pb: any) => (
            <Card key={pb.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedPlaybook(pb.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{pb.name}</CardTitle>
                  <Badge variant={pb.active ? 'default' : 'secondary'}>{pb.active ? 'Ativo' : 'Inativo'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {pb.description && <p className="text-sm text-muted-foreground mb-2">{pb.description}</p>}
                {pb.segment && <Badge variant="outline" className="text-xs">{pb.segment}</Badge>}
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(pb); }}>Editar</Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPlaybook(pb.id); }}>
                    <ChevronRight className="h-4 w-4" /> Etapas
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Steps Panel */}
      {selectedPlaybook && <PlaybookStepsPanel playbookId={selectedPlaybook} onClose={() => setSelectedPlaybook(null)} />}
    </div>
  );
}

function PlaybookStepsPanel({ playbookId, onClose }: { playbookId: string; onClose: () => void }) {
  const { data: steps = [], isLoading } = usePlaybookSteps(playbookId);
  const upsertSteps = useUpsertPlaybookSteps();
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !isLoading && steps) {
    setLocalSteps(steps.map((s: any) => ({ ...s })));
    setInitialized(true);
  }

  const addStep = () => {
    setLocalSteps([...localSteps, {
      step_order: localSteps.length + 1,
      type: 'task',
      delay_days: 1,
      subject: '',
      description: '',
      required: true,
    }]);
  };

  const updateStep = (idx: number, field: string, value: any) => {
    const updated = [...localSteps];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalSteps(updated);
  };

  const removeStep = (idx: number) => {
    setLocalSteps(localSteps.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      await upsertSteps.mutateAsync({ playbook_id: playbookId, steps: localSteps });
      toast.success('Etapas salvas');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Etapas do Playbook</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addStep}><Plus className="h-4 w-4 mr-1" /> Etapa</Button>
            <Button size="sm" onClick={handleSave} disabled={upsertSteps.isPending}>Salvar</Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground">Carregando...</p> : localSteps.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma etapa. Clique em "+ Etapa" para começar.</p>
        ) : (
          <div className="space-y-3">
            {localSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-sm font-medium">{idx + 1}</span>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Select value={step.type} onValueChange={v => updateStep(idx, 'type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="call">Ligação</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="task">Tarefa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Assunto" value={step.subject || ''} onChange={e => updateStep(idx, 'subject', e.target.value)} />
                  <Input type="number" placeholder="Dias de delay" value={step.delay_days} onChange={e => updateStep(idx, 'delay_days', parseInt(e.target.value) || 0)} />
                  <Button variant="destructive" size="sm" onClick={() => removeStep(idx)}>Remover</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

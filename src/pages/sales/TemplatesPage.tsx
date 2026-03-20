import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTemplates, useUpsertTemplate } from '@/hooks/usePlaybookData';
import { Plus, FileText, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const { data: templates = [], isLoading } = useTemplates();
  const upsertTemplate = useUpsertTemplate();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'email', name: '', subject: '', body: '', variables: [] as string[], active: true });

  const handleSave = async () => {
    if (!form.name || !form.body) { toast.error('Nome e corpo obrigatórios'); return; }
    try {
      await upsertTemplate.mutateAsync({ ...form, id: editingId || undefined });
      toast.success(editingId ? 'Template atualizado' : 'Template criado');
      setShowForm(false);
      setEditingId(null);
      setForm({ type: 'email', name: '', subject: '', body: '', variables: [], active: true });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = (t: any) => {
    setForm({ type: t.type, name: t.name, subject: t.subject || '', body: t.body, variables: t.variables || [], active: t.active });
    setEditingId(t.id);
    setShowForm(true);
  };

  const typeLabel: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-sm text-muted-foreground">Modelos de comunicação para playbooks</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ type: 'email', name: '', subject: '', body: '', variables: [], active: true }); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Template
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Novo'} Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Nome do template" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            {form.type === 'email' && (
              <Input placeholder="Assunto" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            )}
            <Textarea placeholder="Corpo da mensagem. Use {{name}}, {{company}}, {{segment}}, {{pain}} como variáveis." className="min-h-[200px]" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            <div className="flex gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground mr-2">Variáveis disponíveis:</p>
              {['{{name}}', '{{company}}', '{{segment}}', '{{pain}}'].map(v => (
                <Badge key={v} variant="outline" className="cursor-pointer text-xs" onClick={() => setForm({ ...form, body: form.body + ' ' + v })}>
                  {v}
                </Badge>
              ))}
            </div>
            <Button className="w-full" onClick={handleSave} disabled={upsertTemplate.isPending}>
              {upsertTemplate.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : templates.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum template criado.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: any) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{t.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">{typeLabel[t.type] || t.type}</Badge>
                    <Badge variant={t.active ? 'default' : 'secondary'} className="text-xs">{t.active ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {t.subject && <p className="text-sm font-medium mb-1">{t.subject}</p>}
                <p className="text-sm text-muted-foreground line-clamp-3">{t.body}</p>
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>Editar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { useOpportunity, useStageHistory, useNotes, useOpportunityProducts, usePipelineStages } from '@/hooks/useSalesData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, StageBadge } from '@/components/sales/StatusBadge';
import { PermissionGate } from '@/components/sales/PermissionGate';
import { ArrowLeft, Edit, RefreshCw, Trophy, XCircle, Pause, Play, Plus, FileText, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: opp, isLoading } = useOpportunity(id!);
  const { data: history = [] } = useStageHistory(id!);
  const { data: notes = [] } = useNotes('opportunity', id!);
  const { data: products = [] } = useOpportunityProducts(id!);
  const { data: stages = [] } = usePipelineStages();

  const formatCurrency = (v: number) => v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />)}</div>;
  }

  if (!opp) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Oportunidade não encontrada</p>
        <Button variant="link" onClick={() => navigate('/opportunities')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1" onClick={() => navigate('/opportunities')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{opp.title}</h1>
            <p className="text-sm text-muted-foreground">{opp.account?.company_name || '—'}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={opp.pipeline_status} />
              {opp.stage && <StageBadge stage={opp.stage.stage_name} color={opp.stage.color} />}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <PermissionGate permissionKey="opportunities.edit">
            <Button variant="outline" size="sm"><Edit className="h-3.5 w-3.5 mr-1" /> Editar</Button>
          </PermissionGate>
          <PermissionGate permissionKey="opportunities.change_stage">
            <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5 mr-1" /> Mudar Etapa</Button>
          </PermissionGate>
          <PermissionGate permissionKey="opportunities.mark_won">
            <Button variant="outline" size="sm" className="text-[hsl(var(--success))]"><Trophy className="h-3.5 w-3.5 mr-1" /> Ganho</Button>
          </PermissionGate>
          <PermissionGate permissionKey="opportunities.mark_lost">
            <Button variant="outline" size="sm" className="text-destructive"><XCircle className="h-3.5 w-3.5 mr-1" /> Perda</Button>
          </PermissionGate>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled={opp.pipeline_status !== 'open'}><Pause className="h-3.5 w-3.5 mr-1" /> Hold</Button>
            </TooltipTrigger>
            {opp.pipeline_status !== 'open' && <TooltipContent>Apenas oportunidades abertas</TooltipContent>}
          </Tooltip>
          <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Atividade</Button>
          <Button variant="outline" size="sm"><FileText className="h-3.5 w-3.5 mr-1" /> Proposta</Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Oportunidade</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'MRR Estimado', value: formatCurrency(opp.estimated_mrr) },
                  { label: 'Setup Estimado', value: formatCurrency(opp.estimated_setup) },
                  { label: 'TCV Estimado', value: formatCurrency(opp.estimated_tcv) },
                  { label: 'Probabilidade', value: opp.probability ? `${opp.probability}%` : '—' },
                  { label: 'Previsão de Fechamento', value: opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString('pt-BR') : '—' },
                  { label: 'Contato', value: opp.contact ? `${opp.contact.first_name} ${opp.contact.last_name || ''}` : '—' },
                  { label: 'Origem', value: opp.source?.source_name || '—' },
                  { label: 'Segmento', value: opp.segment?.segment_name || '—' },
                  { label: 'Concorrente', value: opp.competitor_name || '—' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {opp.strategic_notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notas Estratégicas</p>
                  <p className="text-sm">{opp.strategic_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products */}
          {products.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Produtos</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {products.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{p.product_name}</p>
                        <p className="text-xs text-muted-foreground">{p.recurrence || '—'} • Qtd: {p.quantity || 1}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(p.total_price || 0)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Notas</CardTitle>
              <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Nota</Button>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((n: any) => (
                    <div key={n.id} className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm">{n.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stage Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Histórico de Etapas</CardTitle></CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem histórico</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any) => (
                    <div key={h.id} className="relative pl-4 border-l-2 border-muted pb-3 last:pb-0">
                      <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-primary" />
                      <div className="flex items-center gap-2">
                        {h.from_stage && <StageBadge stage={h.from_stage.stage_name} color={h.from_stage.color} />}
                        {h.from_stage && <span className="text-xs text-muted-foreground">→</span>}
                        <StageBadge stage={h.to_stage?.stage_name || '—'} color={h.to_stage?.color} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(h.changed_at).toLocaleString('pt-BR')}</p>
                      {h.notes && <p className="text-xs mt-0.5">{h.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Stages Progress */}
          <Card>
            <CardHeader><CardTitle className="text-base">Etapas do Pipeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {stages.filter((s: any) => s.is_active).sort((a: any, b: any) => a.stage_order - b.stage_order).map((s: any) => {
                  const isCurrent = s.id === opp.stage_id;
                  const isPast = s.stage_order < (opp.stage?.stage_order || 0);
                  return (
                    <div key={s.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isCurrent ? 'bg-primary/10 font-semibold text-primary' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                      <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-primary' : isPast ? 'bg-muted-foreground' : 'bg-muted'}`} />
                      {s.stage_name}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

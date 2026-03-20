import { useParams, useNavigate } from 'react-router-dom';
import { useOpportunity, useStageHistory, usePipelineStages, useActivities, useMoveOpportunityStage, useLossReasons, useUpsertForecast, useLinkProposal } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { ArrowLeft, ArrowRight, Clock, FileText, Percent, Link2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: opp, isLoading } = useOpportunity(id!);
  const { data: history = [] } = useStageHistory(id!);
  const { data: stages = [] } = usePipelineStages();
  const { data: activities = [] } = useActivities({ opportunity_id: id! });
  const { data: lossReasons = [] } = useLossReasons();
  const moveMutation = useMoveOpportunityStage();
  const forecastMutation = useUpsertForecast();
  const proposalMutation = useLinkProposal();
  const { hasAnyRole } = useSalesAuth();

  const [moveOpen, setMoveOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [toStageId, setToStageId] = useState('');
  const [moveNotes, setMoveNotes] = useState('');
  const [moveStatus, setMoveStatus] = useState('');
  const [lossReasonId, setLossReasonId] = useState('');
  const [wonAmount, setWonAmount] = useState('');
  const [wonMRR, setWonMRR] = useState('');

  const canEdit = hasAnyRole(['admin', 'gerente_comercial', 'comercial']);

  const activeStages = useMemo(() =>
    stages.filter((s: any) => s.is_active).sort((a: any, b: any) => a.stage_order - b.stage_order),
    [stages]
  );

  const formatCurrency = (v: any) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';

  const handleMove = async () => {
    if (!toStageId) return;
    const payload: any = { opportunity_id: id!, to_stage_id: toStageId, notes: moveNotes || undefined };
    if (moveStatus === 'won') { payload.status = 'won'; if (wonAmount) payload.amount = parseFloat(wonAmount); if (wonMRR) payload.monthly_value = parseFloat(wonMRR); }
    else if (moveStatus === 'lost') { if (!lossReasonId) { toast.error('Selecione o motivo'); return; } payload.status = 'lost'; payload.loss_reason_id = lossReasonId; }
    else if (moveStatus === 'hold') { payload.status = 'hold'; }
    try { await moveMutation.mutateAsync(payload); toast.success('Estágio atualizado'); setMoveOpen(false); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleForecast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const prob = fd.get('probability_percent') ? Number(fd.get('probability_percent')) : undefined;
    const month = fd.get('expected_close_month') as string || undefined;
    if (prob !== undefined && (prob < 0 || prob > 100)) { toast.error('Probabilidade entre 0 e 100'); return; }
    try {
      await forecastMutation.mutateAsync({ opportunity_id: id!, probability_percent: prob, expected_close_month: month ? `${month}-01` : undefined });
      toast.success('Forecast atualizado');
      setForecastOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await proposalMutation.mutateAsync({
        opportunity_id: id!,
        proposal_external_id: fd.get('proposal_external_id') as string || undefined,
        proposal_number: fd.get('proposal_number') as string || undefined,
      });
      toast.success('Proposta vinculada');
      setProposalOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

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

  const oppActivities = activities.filter((a: any) => a.opportunity_id === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1" onClick={() => navigate('/pipeline')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{opp.title}</h1>
            <p className="text-sm text-muted-foreground">{opp.account?.name || '—'}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={opp.status} />
              {opp.stage && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: opp.stage.color || 'hsl(var(--primary))' }}>
                  {opp.stage.stage_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-1.5 flex-wrap">
            {opp.status === 'open' && (
              <Button variant="outline" size="sm" onClick={() => { setMoveOpen(true); setToStageId(''); setMoveNotes(''); setMoveStatus(''); }}>
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Mover
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setForecastOpen(true)}>
              <Percent className="h-3.5 w-3.5 mr-1" /> Forecast
            </Button>
            <Button variant="outline" size="sm" onClick={() => setProposalOpen(true)}>
              <Link2 className="h-3.5 w-3.5 mr-1" /> Proposta
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Data */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Oportunidade</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Valor', value: formatCurrency(opp.amount) },
                  { label: 'MRR', value: formatCurrency(opp.monthly_value) },
                  { label: 'Probabilidade', value: opp.probability_percent !== null && opp.probability_percent !== undefined ? `${opp.probability_percent}%` : '—' },
                  { label: 'Ponderado', value: formatCurrency(opp.weighted_amount) },
                  { label: 'Previsão', value: opp.close_date ? new Date(opp.close_date).toLocaleDateString('pt-BR') : '—' },
                  { label: 'Mês Previsto', value: opp.expected_close_month ? new Date(opp.expected_close_month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—' },
                  { label: 'Temperatura', value: opp.temperature || '—' },
                  { label: 'Status', value: opp.status },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Proposal link */}
              {(opp.proposal_number || opp.proposal_external_id) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Proposta Vinculada</p>
                  <div className="flex gap-4">
                    {opp.proposal_number && <p className="text-sm font-medium">Nº {opp.proposal_number}</p>}
                    {opp.proposal_external_id && <p className="text-sm text-muted-foreground">ID: {opp.proposal_external_id}</p>}
                  </div>
                </div>
              )}

              {opp.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{opp.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activities */}
          <Card>
            <CardHeader><CardTitle className="text-base">Atividades ({oppActivities.length})</CardTitle></CardHeader>
            <CardContent>
              {oppActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade vinculada</p>
              ) : (
                <div className="space-y-3">
                  {oppActivities.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{a.subject}</p>
                        <p className="text-xs text-muted-foreground">{a.activity_type} • {a.status}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{a.due_at ? new Date(a.due_at).toLocaleDateString('pt-BR') : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Stage History */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Histórico de Estágios</CardTitle></CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem histórico</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any) => (
                    <div key={h.id} className="relative pl-4 border-l-2 border-muted pb-3 last:pb-0">
                      <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-primary" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {h.from_stage && (
                          <>
                            <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: h.from_stage.color || 'hsl(var(--muted))' }}>{h.from_stage.stage_name}</span>
                            <span className="text-xs text-muted-foreground">→</span>
                          </>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: h.to_stage?.color || 'hsl(var(--primary))' }}>{h.to_stage?.stage_name || '—'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{new Date(h.changed_at).toLocaleString('pt-BR')}</p>
                      {h.notes && <p className="text-xs mt-0.5">{h.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stage Progress */}
          <Card>
            <CardHeader><CardTitle className="text-base">Etapas do Pipeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {activeStages.map((s: any) => {
                  const isCurrent = s.id === opp.pipeline_stage_id;
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

      {/* Move Stage Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mover Estágio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Estágio</Label>
              <Select value={toStageId} onValueChange={setToStageId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{activeStages.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.stage_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ação adicional</Label>
              <Select value={moveStatus} onValueChange={setMoveStatus}>
                <SelectTrigger><SelectValue placeholder="Apenas mover" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="move_only">Apenas mover</SelectItem>
                  <SelectItem value="won">Marcar Ganho</SelectItem>
                  <SelectItem value="lost">Marcar Perdido</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {moveStatus === 'won' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Valor Final</Label><Input type="number" value={wonAmount} onChange={(e) => setWonAmount(e.target.value)} /></div>
                <div><Label className="text-xs">MRR Final</Label><Input type="number" value={wonMRR} onChange={(e) => setWonMRR(e.target.value)} /></div>
              </div>
            )}
            {moveStatus === 'lost' && (
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select value={lossReasonId} onValueChange={setLossReasonId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{lossReasons.filter((r: any) => r.is_active).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.reason_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Observação</Label><Textarea value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
            <Button onClick={handleMove} disabled={!toStageId || moveMutation.isPending}>{moveMutation.isPending ? 'Movendo...' : 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forecast Dialog */}
      <Dialog open={forecastOpen} onOpenChange={setForecastOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atualizar Forecast</DialogTitle></DialogHeader>
          <form onSubmit={handleForecast} className="space-y-4">
            <div className="space-y-2">
              <Label>Probabilidade (%)</Label>
              <Input name="probability_percent" type="number" min="0" max="100" step="1" defaultValue={opp.probability_percent ?? ''} placeholder="0-100" />
              {opp.status === 'won' && <p className="text-xs text-muted-foreground">Won = 100% automático</p>}
              {opp.status === 'lost' && <p className="text-xs text-muted-foreground">Lost = 0% automático</p>}
            </div>
            <div className="space-y-2">
              <Label>Mês previsto de fechamento</Label>
              <Input name="expected_close_month" type="month" defaultValue={opp.expected_close_month?.substring(0, 7) || ''} />
            </div>
            {opp.amount && opp.probability_percent !== null && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Valor ponderado atual</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(opp.weighted_amount)}</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForecastOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={forecastMutation.isPending}>{forecastMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Proposal Dialog */}
      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular Proposta</DialogTitle></DialogHeader>
          <form onSubmit={handleProposal} className="space-y-4">
            <div className="space-y-2">
              <Label>Número da Proposta</Label>
              <Input name="proposal_number" defaultValue={opp.proposal_number || ''} placeholder="Ex: PROP-2026-001" />
            </div>
            <div className="space-y-2">
              <Label>ID Externo</Label>
              <Input name="proposal_external_id" defaultValue={opp.proposal_external_id || ''} placeholder="ID do sistema de propostas" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProposalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={proposalMutation.isPending}>{proposalMutation.isPending ? 'Salvando...' : 'Vincular'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

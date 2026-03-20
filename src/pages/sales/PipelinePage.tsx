import { usePipelineBoard, useMoveOpportunityStage, usePipelineStages, useLossReasons } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ArrowRight, Trophy, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function PipelinePage() {
  const { data: board, isLoading } = usePipelineBoard('open');
  const { data: stages = [] } = usePipelineStages();
  const { data: lossReasons = [] } = useLossReasons();
  const moveMutation = useMoveOpportunityStage();
  const { hasAnyRole } = useSalesAuth();
  const navigate = useNavigate();

  const [moveDialog, setMoveDialog] = useState<{ opp: any; open: boolean }>({ opp: null, open: false });
  const [toStageId, setToStageId] = useState('');
  const [moveNotes, setMoveNotes] = useState('');
  const [moveStatus, setMoveStatus] = useState<string>('');
  const [lossReasonId, setLossReasonId] = useState('');
  const [wonAmount, setWonAmount] = useState('');
  const [wonMRR, setWonMRR] = useState('');

  const canMove = hasAnyRole(['admin', 'gerente_comercial', 'comercial']);

  const activeStages = useMemo(() =>
    stages.filter((s: any) => s.is_active).sort((a: any, b: any) => a.stage_order - b.stage_order),
    [stages]
  );

  const formatCurrency = (v: number) => v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';

  const openMoveDialog = (opp: any) => {
    setMoveDialog({ opp, open: true });
    setToStageId('');
    setMoveNotes('');
    setMoveStatus('');
    setLossReasonId('');
    setWonAmount(opp.amount?.toString() || '');
    setWonMRR(opp.monthly_value?.toString() || '');
  };

  const handleMove = async () => {
    if (!toStageId || !moveDialog.opp) return;

    const payload: any = {
      opportunity_id: moveDialog.opp.id,
      to_stage_id: toStageId,
      notes: moveNotes || undefined,
    };

    if (moveStatus === 'won') {
      payload.status = 'won';
      if (wonAmount) payload.amount = parseFloat(wonAmount);
      if (wonMRR) payload.monthly_value = parseFloat(wonMRR);
    } else if (moveStatus === 'lost') {
      if (!lossReasonId) { toast.error('Selecione o motivo da perda'); return; }
      payload.status = 'lost';
      payload.loss_reason_id = lossReasonId;
    } else if (moveStatus === 'hold') {
      payload.status = 'hold';
    }

    try {
      await moveMutation.mutateAsync(payload);
      toast.success('Estágio atualizado com sucesso');
      setMoveDialog({ opp: null, open: false });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao mover oportunidade');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-72 flex-shrink-0 h-96 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const columns = board?.columns || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {board?.total_opportunities || 0} oportunidades • {formatCurrency(board?.total_amount || 0)} total
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {columns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Nenhum estágio configurado no pipeline</p>
          </div>
        ) : (
          columns.map((col: any) => (
            <div key={col.id} className="w-72 flex-shrink-0 flex flex-col">
              <div className="p-3 rounded-t-lg border-t-2 bg-card" style={{ borderTopColor: col.color || 'hsl(var(--primary))' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{col.stage_name}</h3>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">{col.count}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(col.total_amount)}</p>
              </div>

              <div className="flex-1 space-y-2 p-1 overflow-y-auto">
                {col.opportunities?.map((opp: any) => (
                  <Card key={opp.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <p
                        className="text-sm font-medium leading-tight cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/opportunities/${opp.id}`)}
                      >
                        {opp.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{opp.account?.name || '—'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(Number(opp.amount) || 0)}</span>
                        {opp.temperature && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            opp.temperature === 'hot' ? 'bg-destructive/10 text-destructive' :
                            opp.temperature === 'warm' ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {opp.temperature === 'hot' ? '🔥 Quente' : opp.temperature === 'warm' ? '☀️ Morno' : '❄️ Frio'}
                          </span>
                        )}
                      </div>
                      {opp.close_date && (
                        <div className="flex items-center gap-1">
                          {new Date(opp.close_date) < new Date() && (
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          )}
                          <span className={`text-xs ${new Date(opp.close_date) < new Date() ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            {new Date(opp.close_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                      {canMove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); openMoveDialog(opp); }}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" /> Mover
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(!col.opportunities || col.opportunities.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhuma oportunidade</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Move Stage Dialog */}
      <Dialog open={moveDialog.open} onOpenChange={(o) => setMoveDialog({ ...moveDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Oportunidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{moveDialog.opp?.title}</p>

            <div className="space-y-2">
              <Label>Novo Estágio</Label>
              <Select value={toStageId} onValueChange={setToStageId}>
                <SelectTrigger><SelectValue placeholder="Selecione o estágio" /></SelectTrigger>
                <SelectContent>
                  {activeStages.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.stage_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ação adicional (opcional)</Label>
              <Select value={moveStatus} onValueChange={setMoveStatus}>
                <SelectTrigger><SelectValue placeholder="Apenas mover estágio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="move_only">Apenas mover estágio</SelectItem>
                  <SelectItem value="won">Marcar como Ganho</SelectItem>
                  <SelectItem value="lost">Marcar como Perdido</SelectItem>
                  <SelectItem value="hold">Colocar em Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {moveStatus === 'won' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Valor Final</Label>
                  <Input type="number" value={wonAmount} onChange={(e) => setWonAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">MRR Final</Label>
                  <Input type="number" value={wonMRR} onChange={(e) => setWonMRR(e.target.value)} placeholder="0.00" />
                </div>
              </div>
            )}

            {moveStatus === 'lost' && (
              <div className="space-y-2">
                <Label>Motivo da Perda *</Label>
                <Select value={lossReasonId} onValueChange={setLossReasonId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                  <SelectContent>
                    {lossReasons.filter((r: any) => r.is_active).map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.reason_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} placeholder="Motivo da movimentação..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog({ opp: null, open: false })}>Cancelar</Button>
            <Button onClick={handleMove} disabled={!toStageId || moveMutation.isPending}>
              {moveMutation.isPending ? 'Movendo...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

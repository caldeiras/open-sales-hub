import { useOpportunities, usePipelineStages } from '@/hooks/useSalesData';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function PipelinePage() {
  const { data: stages = [], isLoading: loadingStages } = usePipelineStages();
  const { data: opportunities = [], isLoading: loadingOpp } = useOpportunities({ pipeline_status: 'open' });
  const navigate = useNavigate();

  const columns = useMemo(() => {
    return stages
      .filter((s: any) => s.is_active)
      .sort((a: any, b: any) => a.stage_order - b.stage_order)
      .map((stage: any) => ({
        ...stage,
        opportunities: opportunities.filter((o: any) => o.stage_id === stage.id),
      }));
  }, [stages, opportunities]);

  const formatCurrency = (v: number) => v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';

  const loading = loadingStages || loadingOpp;

  if (loading) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Visão Kanban das oportunidades</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {columns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Nenhum estágio configurado no pipeline</p>
          </div>
        ) : (
          columns.map((col: any) => {
            const totalValue = col.opportunities.reduce((s: number, o: any) => s + (o.estimated_tcv || 0), 0);
            return (
              <div key={col.id} className="w-72 flex-shrink-0 flex flex-col">
                {/* Column Header */}
                <div className="p-3 rounded-t-lg border-t-2" style={{ borderTopColor: col.color || 'hsl(var(--primary))' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{col.stage_name}</h3>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">{col.opportunities.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totalValue)}</p>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 p-1 overflow-y-auto">
                  {col.opportunities.map((opp: any) => (
                    <Card key={opp.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/opportunities/${opp.id}`)}>
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-medium leading-tight">{opp.title}</p>
                        <p className="text-xs text-muted-foreground">{opp.account?.company_name || '—'}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">{formatCurrency(opp.estimated_tcv || 0)}</span>
                          {opp.probability && <span className="text-xs text-muted-foreground">{opp.probability}%</span>}
                        </div>
                        {opp.expected_close_date && (
                          <div className="flex items-center gap-1">
                            {new Date(opp.expected_close_date) < new Date() && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                            <span className={`text-xs ${new Date(opp.expected_close_date) < new Date() ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              {new Date(opp.expected_close_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {col.opportunities.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhuma oportunidade</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

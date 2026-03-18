import { KPICard } from '@/components/sales/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, DollarSign, Users, FileText, CalendarCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Goals page - visual structure prepared for future table
// Using placeholder data until sales_goals table is implemented

const mockGoals = [
  { metric: 'MRR', target: 150000, achieved: 87000, unit: 'R$' },
  { metric: 'TCV', target: 500000, achieved: 320000, unit: 'R$' },
  { metric: 'Reuniões', target: 40, achieved: 28, unit: '' },
  { metric: 'Propostas', target: 20, achieved: 14, unit: '' },
  { metric: 'Novos Clientes', target: 8, achieved: 5, unit: '' },
];

export default function GoalsPage() {
  const formatValue = (v: number, unit: string) => unit === 'R$' ? `R$ ${v.toLocaleString('pt-BR')}` : v.toString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Metas</h1>
        <p className="text-sm text-muted-foreground">Acompanhamento de metas comerciais</p>
        <p className="text-xs text-[hsl(var(--warning))] mt-1">⚠ Dados de exemplo — aguardando integração com tabela de metas</p>
      </div>

      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="team">Por Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockGoals.map((goal) => {
              const pct = Math.round((goal.achieved / goal.target) * 100);
              return (
                <Card key={goal.metric}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{goal.metric}</p>
                      <span className={`text-xs font-semibold ${pct >= 100 ? 'text-[hsl(var(--success))]' : pct >= 70 ? 'text-[hsl(var(--warning))]' : 'text-destructive'}`}>
                        {pct}%
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="h-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{formatValue(goal.achieved, goal.unit)}</span>
                      <span className="text-muted-foreground">de {formatValue(goal.target, goal.unit)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Visão por equipe</p>
              <p className="text-sm">Disponível após integração com tabela de metas</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

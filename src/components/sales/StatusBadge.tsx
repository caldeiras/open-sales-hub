import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'Aberto', className: 'bg-primary/10 text-primary border-primary/20' },
  won: { label: 'Ganho', className: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]' },
  lost: { label: 'Perdido', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  hold: { label: 'Em Espera', className: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]' },
  new: { label: 'Novo', className: 'bg-primary/10 text-primary border-primary/20' },
  qualified: { label: 'Qualificado', className: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]' },
  disqualified: { label: 'Desqualificado', className: 'bg-muted text-muted-foreground border-muted' },
  converted: { label: 'Convertido', className: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]' },
  active: { label: 'Ativo', className: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]' },
  inactive: { label: 'Inativo', className: 'bg-muted text-muted-foreground border-muted' },
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground border-muted' },
  sent: { label: 'Enviada', className: 'bg-primary/10 text-primary border-primary/20' },
  approved: { label: 'Aprovada', className: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]' },
  rejected: { label: 'Rejeitada', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  expired: { label: 'Expirada', className: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]' },
  pending: { label: 'Pendente', className: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]' },
  completed: { label: 'Concluída', className: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]' },
  overdue: { label: 'Atrasada', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  hot: { label: 'Quente', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  warm: { label: 'Morno', className: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]' },
  cold: { label: 'Frio', className: 'bg-primary/10 text-primary border-primary/20' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status?.toLowerCase()] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase', config.className, className)}>
      {config.label}
    </Badge>
  );
}

export function StageBadge({ stage, color, className }: { stage: string; color?: string; className?: string }) {
  return (
    <Badge 
      variant="outline" 
      className={cn('text-[10px] font-semibold', className)}
      style={color ? { backgroundColor: `${color}15`, color, borderColor: `${color}30` } : undefined}
    >
      {stage}
    </Badge>
  );
}

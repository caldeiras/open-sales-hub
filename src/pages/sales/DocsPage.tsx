import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, Copy, Download, BookOpen, Layers, Server, Database, Play, ClipboardList, Shield, RefreshCw, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import architectureMd from '@/docs/architecture.md?raw';
import modulesMd from '@/docs/modules.md?raw';
import apiMd from '@/docs/api.md?raw';
import dataMd from '@/docs/data.md?raw';
import playbooksMd from '@/docs/playbooks-doc.md?raw';
import runbooksMd from '@/docs/runbooks.md?raw';
import rbacMd from '@/docs/rbac.md?raw';
import syncMd from '@/docs/sync.md?raw';

const sections = [
  { id: 'architecture', label: 'Arquitetura', icon: Layers, content: architectureMd },
  { id: 'modules', label: 'Módulos', icon: BookOpen, content: modulesMd },
  { id: 'api', label: 'API', icon: Server, content: apiMd },
  { id: 'data', label: 'Data Model', icon: Database, content: dataMd },
  { id: 'playbooks', label: 'Playbooks', icon: Play, content: playbooksMd },
  { id: 'runbooks', label: 'Runbooks', icon: ClipboardList, content: runbooksMd },
  { id: 'rbac', label: 'RBAC', icon: Shield, content: rbacMd },
  { id: 'sync', label: 'Sync', icon: RefreshCw, content: syncMd },
] as const;

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const current = sections.find(s => s.id === activeSection)!;

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      s => s.label.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [search]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.content);
    setCopied(true);
    toast.success('Conteúdo copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([current.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download iniciado');
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.12)-theme(spacing.12))] gap-0 -m-6">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na documentação..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {filteredSections.map(s => {
              const Icon = s.icon;
              const isActive = s.id === activeSection;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveSection(s.id); setSearch(''); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
            {filteredSections.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">Nenhum resultado encontrado.</p>
            )}
          </nav>
        </ScrollArea>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
          <h2 className="text-lg font-semibold tracking-tight">{current.label}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Baixar .md
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <article className="prose prose-sm dark:prose-invert max-w-none px-8 py-6
            prose-headings:scroll-mt-4
            prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:pb-3 prose-h1:mb-6
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-base prose-h3:font-semibold
            prose-table:text-sm
            prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2
            prose-td:px-3 prose-td:py-2
            prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {current.content}
            </ReactMarkdown>
          </article>
        </ScrollArea>
      </div>
    </div>
  );
}

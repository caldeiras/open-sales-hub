import {
  LayoutDashboard, Users, Building2, Contact, Target, Kanban,
  CalendarCheck, FileText, TrendingUp, DollarSign, BarChart3, Settings,
  LogOut, UsersRound, Map, Briefcase, BookOpen, MessageSquare, Bell,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const executionItems = [
  { title: 'Visão Geral', url: '/', icon: LayoutDashboard },
  { title: 'Leads', url: '/leads', icon: Users },
  { title: 'Empresas', url: '/accounts', icon: Building2 },
  { title: 'Contatos', url: '/contacts', icon: Contact },
  { title: 'Oportunidades', url: '/opportunities', icon: Target },
  { title: 'Pipeline', url: '/pipeline', icon: Kanban },
  { title: 'Atividades', url: '/activities', icon: CalendarCheck },
  { title: 'Propostas', url: '/proposals', icon: FileText },
];

const resultItems = [
  { title: 'Metas', url: '/goals', icon: TrendingUp },
  { title: 'Comissão', url: '/commissions', icon: DollarSign },
  { title: 'Relatórios', url: '/reports', icon: BarChart3 },
];

const structureItems = [
  { title: 'Times', url: '/teams', icon: UsersRound },
  { title: 'Territórios', url: '/territories', icon: Map },
  { title: 'Carteira', url: '/portfolio', icon: Briefcase },
];

const adminItems = [
  { title: 'Configurações', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, roles, profile, signOut, hasRole } = useSalesAuth();

  const displayEmail = user?.email || 'Não autenticado';
  const displayRole = roles.length > 0 ? roles[0] : null;
  const showAdmin = hasRole('admin') || hasRole('gerente_comercial');

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">OS</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground">OPEN SALES</h1>
              <p className="text-[10px] text-sidebar-muted">Execução Comercial</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">Execução</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {executionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/'} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">Resultados</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {resultItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">Estrutura</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {structureItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">Admin</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="space-y-2">
            <div className="px-2 py-1.5">
              <p className="text-xs text-sidebar-foreground truncate">{displayEmail}</p>
              {displayRole && <p className="text-[10px] text-sidebar-muted capitalize">{displayRole}</p>}
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

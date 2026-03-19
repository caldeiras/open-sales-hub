import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/sales/AppSidebar';

interface SalesLayoutProps {
  children: React.ReactNode;
}

export function SalesLayout({ children }: SalesLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 px-4">
            <SidebarTrigger className="mr-3" />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

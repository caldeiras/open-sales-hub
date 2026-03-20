import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SalesAuthProvider } from "@/contexts/SalesAuthContext";
import { AuthGuard } from "@/components/sales/AuthGuard";
import { SalesLayout } from "@/components/sales/SalesLayout";
import NotFound from "./pages/NotFound.tsx";

// Sales Pages
import DashboardPage from "./pages/sales/DashboardPage";
import LeadsPage from "./pages/sales/LeadsPage";
import AccountsPage from "./pages/sales/AccountsPage";
import ContactsPage from "./pages/sales/ContactsPage";
import OpportunitiesPage from "./pages/sales/OpportunitiesPage";
import OpportunityDetailPage from "./pages/sales/OpportunityDetailPage";
import PipelinePage from "./pages/sales/PipelinePage";
import ActivitiesPage from "./pages/sales/ActivitiesPage";
import ProposalsPage from "./pages/sales/ProposalsPage";
import GoalsPage from "./pages/sales/GoalsPage";
import CommissionsPage from "./pages/sales/CommissionsPage";
import ReportsPage from "./pages/sales/ReportsPage";
import SettingsPage from "./pages/sales/SettingsPage";
import TeamsPage from "./pages/sales/TeamsPage";
import TerritoriesPage from "./pages/sales/TerritoriesPage";
import PortfolioPage from "./pages/sales/PortfolioPage";
import PlaybooksPage from "./pages/sales/PlaybooksPage";
import TemplatesPage from "./pages/sales/TemplatesPage";
import AlertsPage from "./pages/sales/AlertsPage";
import PriorityPage from "./pages/sales/PriorityPage";
import DocsPage from "./pages/sales/DocsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SalesAuthProvider>
        <BrowserRouter>
          <AuthGuard>
            <SalesLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/opportunities" element={<OpportunitiesPage />} />
                <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
                <Route path="/pipeline" element={<PipelinePage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/proposals" element={<ProposalsPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/commissions" element={<CommissionsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/territories" element={<TerritoriesPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/playbooks" element={<PlaybooksPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/priority" element={<PriorityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SalesLayout>
          </AuthGuard>
        </BrowserRouter>
      </SalesAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./hooks/useAuth";
import { TenantIdentityProvider } from "./hooks/useTenantIdentity";
import { RequireAuth, RequireRole } from "./components/auth/Guards";
import { ErrorBoundary, ErrorFallback } from "./components/ui/ErrorBoundary";
import { ThemeProvider } from "./hooks/useTheme";
import { DashboardLayout } from "./components/layout/DashboardLayout";

// Lazy loaded routes — only Supabase-connected pages
const Index = lazy(() => import("./pages/Index"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const RiskManagementPage = lazy(() => import("./pages/RiskManagementPage"));
const ApprovalQueuePage = lazy(() => import("./pages/ApprovalQueuePage"));
const DatabaseManagementPage = lazy(() => import("./pages/DatabaseManagementPage"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const ProceduresPage = lazy(() => import("./pages/ProceduresPage"));
const ISOManualPage = lazy(() => import("./pages/ISOManualPage"));
const FormsRegistryPage = lazy(() => import("./pages/FormsRegistryPage"));
const FormTemplatePreview = lazy(() => import("./pages/FormTemplatePreview"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const RecordCreationPage = lazy(() => import("./pages/RecordCreationPage"));
const RecordListPage = lazy(() => import("./pages/RecordListPage"));
const RecordViewPage = lazy(() => import("./pages/RecordViewPage"));
const DataIntegrityPage = lazy(() => import("./pages/DataIntegrityPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const KPIDashboardPage = lazy(() => import("./pages/KPIDashboardPage"));
const KPIReportsPage = lazy(() => import("./pages/KPIReportsPage"));
const SWOTAnalysisPage = lazy(() => import("./pages/SWOTAnalysisPage"));
const TraceabilityPage = lazy(() => import("./pages/TraceabilityPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 minute default
      gcTime: 10 * 60_000,      // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Page-level error boundary with retry button
function PageBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[PageBoundary]', error.message, errorInfo.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

const App = () => {
  // Apply saved accent color on boot
  const savedAccent = localStorage.getItem('accentColor') || 'cyan';
  document.documentElement.setAttribute('data-accent', savedAccent);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <ThemeProvider>
          <AuthProvider>
            <TenantIdentityProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Auth routes */}
                    <Route path="/login" element={<PageBoundary><Login /></PageBoundary>} />
                    <Route path="/register" element={<PageBoundary><Register /></PageBoundary>} />
                    <Route path="/auth/callback" element={<PageBoundary><AuthCallback /></PageBoundary>} />

                    {/* Core app routes — all Supabase-connected */}
                    <Route element={<RequireAuth><DashboardLayout><Outlet /></DashboardLayout></RequireAuth>}>
                      <Route path="/" element={<PageBoundary><Index /></PageBoundary>} />
                      <Route path="/audit" element={<PageBoundary><AuditPage /></PageBoundary>} />
                      <Route path="/projects" element={<PageBoundary><ProjectsPage /></PageBoundary>} />
                      <Route path="/project/:projectName" element={<PageBoundary><ProjectDetailPage /></PageBoundary>} />
                      <Route path="/risk-management" element={<PageBoundary><RiskManagementPage /></PageBoundary>} />
                      <Route path="/activity" element={<PageBoundary><ActivityPage /></PageBoundary>} />
                      <Route path="/procedures" element={<PageBoundary><ProceduresPage /></PageBoundary>} />
                      <Route path="/iso-manual" element={<PageBoundary><ISOManualPage /></PageBoundary>} />
                      <Route path="/forms" element={<PageBoundary><FormsRegistryPage /></PageBoundary>} />
                      <Route path="/form/*" element={<PageBoundary><FormTemplatePreview /></PageBoundary>} />
                      <Route path="/notifications" element={<PageBoundary><NotificationsPage /></PageBoundary>} />
                      <Route path="/module/:moduleId" element={<PageBoundary><ModulePage /></PageBoundary>} />
                      <Route path="/kpi" element={<PageBoundary><KPIDashboardPage /></PageBoundary>} />
                      <Route path="/kpi/reports" element={<PageBoundary><KPIReportsPage /></PageBoundary>} />
                      <Route path="/swot-analysis" element={<PageBoundary><SWOTAnalysisPage /></PageBoundary>} />
                      <Route path="/traceability" element={<PageBoundary><TraceabilityPage /></PageBoundary>} />
                      <Route path="/traceability/:recordId" element={<PageBoundary><TraceabilityPage /></PageBoundary>} />
                      <Route path="/create" element={<PageBoundary><RecordCreationPage /></PageBoundary>} />
                      <Route path="/records" element={<PageBoundary><RecordListPage /></PageBoundary>} />
                      <Route path="/records/:serial" element={<PageBoundary><RecordViewPage /></PageBoundary>} />
                      <Route path="/integrity" element={<PageBoundary><DataIntegrityPage /></PageBoundary>} />
                      <Route path="/admin/accounts" element={<RequireRole roles={["admin"]}><PageBoundary><AdminPanel /></PageBoundary></RequireRole>} />
                      <Route path="/admin/database" element={<RequireRole roles={["admin"]}><PageBoundary><DatabaseManagementPage /></PageBoundary></RequireRole>} />
                      <Route path="/admin/approvals" element={<PageBoundary><ApprovalQueuePage /></PageBoundary>} />
                      {/* Redirects for sidebar links */}
                      <Route path="/modules" element={<Navigate to="/module/sales" replace />} />
                      <Route path="/approvals" element={<Navigate to="/admin/approvals" replace />} />
                      <Route path="/admin" element={<Navigate to="/admin/accounts" replace />} />
                    </Route>

                    {/* Legacy redirects */}
                    <Route path="/record/*" element={<Navigate to="/records" replace />} />
                    <Route path="/archive" element={<Navigate to="/records" replace />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
            </TenantIdentityProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
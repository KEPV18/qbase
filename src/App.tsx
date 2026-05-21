import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./hooks/useAuth";
import { TenantIdentityProvider } from "./hooks/useTenantIdentity";
import { RequireAuth, RequireRole } from "./components/auth/Guards";
import { ErrorBoundary, ErrorFallback } from "./components/ui/ErrorBoundary";
import { ThemeProvider } from "./hooks/useTheme";

// Lazy loaded routes — only Supabase-connected pages
const Index = lazy(() => import("./pages/Index"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const RiskManagementPage = lazy(() => import("./pages/RiskManagementPage"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const ProceduresPage = lazy(() => import("./pages/ProceduresPage"));
const ISOManualPage = lazy(() => import("./pages/ISOManualPage"));
const FormsRegistryPage = lazy(() => import("./pages/FormsRegistryPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const RecordCreationPage = lazy(() => import("./pages/RecordCreationPage"));
const RecordListPage = lazy(() => import("./pages/RecordListPage"));
const RecordViewPage = lazy(() => import("./pages/RecordViewPage"));
const DataIntegrityPage = lazy(() => import("./pages/DataIntegrityPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
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
                    <Route path="/" element={<RequireAuth><PageBoundary><Index /></PageBoundary></RequireAuth>} />
                    <Route path="/audit" element={<RequireAuth><PageBoundary><AuditPage /></PageBoundary></RequireAuth>} />
                    <Route path="/projects" element={<RequireAuth><PageBoundary><ProjectsPage /></PageBoundary></RequireAuth>} />
                    <Route path="/project/:projectName" element={<RequireAuth><PageBoundary><ProjectDetailPage /></PageBoundary></RequireAuth>} />
                    <Route path="/risk-management" element={<RequireAuth><PageBoundary><RiskManagementPage /></PageBoundary></RequireAuth>} />
                    <Route path="/activity" element={<RequireAuth><PageBoundary><ActivityPage /></PageBoundary></RequireAuth>} />
                    <Route path="/procedures" element={<RequireAuth><PageBoundary><ProceduresPage /></PageBoundary></RequireAuth>} />
                    <Route path="/iso-manual" element={<RequireAuth><PageBoundary><ISOManualPage /></PageBoundary></RequireAuth>} />
                    <Route path="/forms" element={<RequireAuth><PageBoundary><FormsRegistryPage /></PageBoundary></RequireAuth>} />
                    <Route path="/notifications" element={<RequireAuth><PageBoundary><NotificationsPage /></PageBoundary></RequireAuth>} />

                    {/* Module pages — dedicated page per ISO section */}
                    <Route path="/module/:moduleId" element={<RequireAuth><PageBoundary><ModulePage /></PageBoundary></RequireAuth>} />

                    {/* Record system — Supabase-backed via useRecordStorage */}
                    <Route path="/create" element={<RequireAuth><PageBoundary><RecordCreationPage /></PageBoundary></RequireAuth>} />
                    <Route path="/records" element={<RequireAuth><PageBoundary><RecordListPage /></PageBoundary></RequireAuth>} />
                    <Route path="/records/:serial" element={<RequireAuth><PageBoundary><RecordViewPage /></PageBoundary></RequireAuth>} />

                    {/* Data integrity */}
                    <Route path="/integrity" element={<RequireAuth><PageBoundary><DataIntegrityPage /></PageBoundary></RequireAuth>} />

                    {/* Admin */}
                    <Route path="/admin/accounts" element={<RequireRole roles={["admin"]}><PageBoundary><AdminPanel /></PageBoundary></RequireRole>} />

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
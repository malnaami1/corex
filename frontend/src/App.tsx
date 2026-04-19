import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import WorkerDashboard from "@/pages/worker";
import CompanyDashboard from "@/pages/company";
import { getRole, type Role } from "@/lib/role";

const queryClient = new QueryClient();

function RoleGuard({ required, children }: { required: Role; children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const allowed = getRole() === required;
  useEffect(() => {
    if (!allowed) navigate("/", { replace: true });
  }, [allowed, navigate]);
  if (!allowed) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/worker">
        <RoleGuard required="worker">
          <WorkerDashboard />
        </RoleGuard>
      </Route>
      <Route path="/company">
        <RoleGuard required="company">
          <CompanyDashboard />
        </RoleGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

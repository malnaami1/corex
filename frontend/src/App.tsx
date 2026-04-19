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
import Login from "./pages/login";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";

const queryClient = new QueryClient();

function LogoutButton() {
  const [, navigate] = useLocation();
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };
  return (
    <button
      onClick={handleLogout}
      className="fixed top-4 right-4 z-50 bg-primary hover:bg-[#A8D0FF] text-[#05070F] text-sm font-medium px-4 py-2 rounded-md transition-colors"
    >
      Logout
    </button>
  );
}

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
      <Route path="/login" component={Login} />
      <Route path="/worker">
        <RoleGuard required="worker">
          <LogoutButton />
          <WorkerDashboard />
        </RoleGuard>
      </Route>
      <Route path="/company">
        <RoleGuard required="company">
          <LogoutButton />
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

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import TournamentDetail from "./pages/TournamentDetail";
import AdminDashboard from "./pages/AdminDashboard";
import CreateTournament from "./pages/CreateTournament";
import CreatePortal from "./pages/CreatePortal";
import AdminLogin from "./pages/AdminLogin";

function Router() {
  return (
    <Switch>
      {/* Rotas Globais */}
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/login-admin" component={AdminLogin} />
      <Route path="/create-portal" component={CreatePortal} />

      {/* Rotas de Portal (Tenant) */}
      <Route path="/:portalSlug" component={Home} />
      <Route path="/:portalSlug/tournament/:id" component={TournamentDetail} />
      <Route path="/:portalSlug/admin" component={AdminDashboard} />
      <Route path="/:portalSlug/create" component={CreateTournament} />
      <Route path="/:portalSlug/login-admin" component={AdminLogin} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}


function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.14 0.018 260)",
                border: "1px solid oklch(0.25 0.02 260)",
                color: "oklch(0.96 0.005 260)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

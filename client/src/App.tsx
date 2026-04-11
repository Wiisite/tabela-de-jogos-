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
import AdminLogin from "./pages/AdminLogin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tournament/:id" component={TournamentDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/create" component={CreateTournament} />
      <Route path="/login-admin" component={AdminLogin} />
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

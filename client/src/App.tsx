import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import TicketsList from "./pages/TicketsList";
import TicketDetail from "./pages/TicketDetail";
import NewTicket from "./pages/NewTicket";
import Correspondents from "./pages/Correspondents";
import Departments from "./pages/Departments";
import SlaManagement from "./pages/SlaManagement";
import UsersManagement from "./pages/UsersManagement";
import Notifications from "./pages/Notifications";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import EmailTemplates from "./pages/EmailTemplates";
import ClientsManagement from "./pages/ClientsManagement";
import PortalRegister from "./pages/PortalRegister";
import PortalDashboard from "./pages/PortalDashboard";
import PortalNewTicket from "./pages/PortalNewTicket";
import PortalTicketDetail from "./pages/PortalTicketDetail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Portal do Cliente */}
      <Route path="/portal/cadastro" component={PortalRegister} />
      <Route path="/portal" component={PortalDashboard} />
      <Route path="/portal/novo-chamado" component={PortalNewTicket} />
      <Route path="/portal/chamado/:id" component={PortalTicketDetail} />

      {/* Dashboard interno */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tickets" component={TicketsList} />
      <Route path="/tickets/new" component={NewTicket} />
      <Route path="/tickets/:id" component={TicketDetail} />
      <Route path="/correspondents" component={Correspondents} />
      <Route path="/departments" component={Departments} />
      <Route path="/sla" component={SlaManagement} />
      <Route path="/users" component={UsersManagement} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/email-templates" component={EmailTemplates} />
      <Route path="/clients" component={ClientsManagement} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients";
import ClientFormPage from "@/pages/clients/new";
import ClientDetailPage from "@/pages/clients/[id]";
import AiSearchPage from "@/pages/ai-search";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/clients/new" component={ClientFormPage} />
      <Route path="/clients/:id" component={ClientDetailPage} />
      <Route path="/ai-search" component={AiSearchPage} />
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

import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import WorkspacePage from "@/pages/workspace";
import ChatPage from "@/pages/chat";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/app" component={Home} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/chat/:id">
        {(params) => <ChatPage params={params as { id: string }} />}
      </Route>
      <Route path="/workspace/:id">
        {(params) => <WorkspacePage params={params as { id: string }} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;

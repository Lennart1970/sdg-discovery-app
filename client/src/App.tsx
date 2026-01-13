import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Journey from "./pages/Journey";
import Pathway from "./pages/Pathway";
import Extract from "./pages/Extract";
import Login from "./pages/Login";
import Prompts from "./pages/Prompts";
import Sources from "./pages/Sources";
import Documents from "./pages/Documents";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Journey} />
      <Route path="/login" component={Login} />
      <Route path="/prompts" component={Prompts} />
      <Route path="/sources" component={Sources} />
      <Route path="/documents" component={Documents} />
      <Route path="/pathway/:id" component={Pathway} />
      <Route path="/extract" component={Extract} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

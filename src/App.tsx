import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Testament from "./pages/Testament";
import Debts from "./pages/Debts";
import Wakils from "./pages/Wakils";
import WakilAccess from "./pages/WakilAccess";
import NotFound from "./pages/NotFound";
import DebtEdit from "./pages/DebtEdit";
import DebtApprove from "./pages/DebtApprove";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes - no auth required */}
          <Route path="/debt-approve/:token" element={<DebtApprove />} />
          <Route path="/debt-edit/:token" element={<DebtEdit />} />
          <Route path="/wakil-access" element={<WakilAccess />} />
          {/* Authenticated routes */}
          <Route path="/*" element={
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/testament" element={<Testament />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/wakils" element={<Wakils />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

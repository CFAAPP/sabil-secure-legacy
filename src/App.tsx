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
import Profile from "./pages/Profile";
import Identity from "./pages/Identity";
import Zakat from "./pages/Zakat";
import ResetPassword from "./pages/ResetPassword";
import Contracts from "./pages/Contracts";
import SharedWithMe from "./pages/SharedWithMe";
import MentionResponse from "./pages/MentionResponse";
import Contacts from "./pages/Contacts";
import Users from "./pages/Users";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes - no auth required */}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/debt-approve/:token" element={<DebtApprove />} />
            <Route path="/debt-edit/:token" element={<DebtEdit />} />
            <Route path="/wakil-access" element={<WakilAccess />} />
            <Route path="/mention-response" element={<MentionResponse />} />
            {/* Authenticated routes */}
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/testament" element={<Testament />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/zakat" element={<Zakat />} />
            <Route path="/wakils" element={<Wakils />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/identity" element={<Identity />} />
            <Route path="/shared" element={<SharedWithMe />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/users" element={<Users />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

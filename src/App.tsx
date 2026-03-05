import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import OnboardingTour from "@/components/OnboardingTour";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminManageDevices from "./pages/AdminManageDevices";
import Devices from "./pages/Devices";
import DeviceDetails from "./pages/DeviceDetails";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import SubscriptionPage from "./components/SubscriptionPage";
import BillingPage from "./components/BillingPage";
import NotificationSettings from "./pages/NotificationSettings";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

// Create a protected route component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page but remember the location they were trying to access
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

// Create an admin-only route component
const AdminRoute = () => (
  <ProtectedRoute>
    <Admin />
  </ProtectedRoute>
);

const AdminManageDevicesRoute = () => (
  <ProtectedRoute>
    <AdminManageDevices />
  </ProtectedRoute>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      
      <Route path="/devices" element={
        <ProtectedRoute>
          <Devices />
        </ProtectedRoute>
      } />

      <Route path="/devices/:id" element={
        <ProtectedRoute>
          <DeviceDetails />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/subscription" element={
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      } />
      
      <Route path="/billing" element={
        <ProtectedRoute>
          <BillingPage />
        </ProtectedRoute>
      } />
      
      <Route path="/notifications" element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      } />
      
      <Route path="/notifications/settings" element={
        <ProtectedRoute>
          <NotificationSettings />
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="/admin/devices" element={<AdminManageDevicesRoute />} />

      {/* Catch-all routes */}
      <Route path="/" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <AuthProvider>
          <OnboardingProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <OnboardingTour />
            <Toaster />
            <Sonner />
          </OnboardingProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
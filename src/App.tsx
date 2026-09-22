
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import PortfolioRedirect from "./components/layout/PortfolioRedirect";
import CommandPalette from "./components/command-palette/CommandPalette";
import AllEntries from "./pages/AllEntries";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import AdminProjects from "./pages/AdminProjects"; 
import AdminContent from "./pages/AdminContent";
import AdminPrompts from "./pages/AdminPrompts";
import AdminUsers from "./pages/AdminUsers";
import AdminAbout from "./pages/AdminAbout";
import ProjectEditor from "./pages/ProjectEditor";
import ContentEditor from "./pages/ContentEditor";
import ContentDetail from "./pages/ContentDetail";
import ExperienceOasis from "./pages/ExperienceOasis";
import NotFound from "./pages/NotFound";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [isApiKeyChecked, setIsApiKeyChecked] = useState(false);
  
  // Check OpenAI key and update schema on first load
  useEffect(() => {
    const init = async () => {
      // Update the content_entries schema
      try {
        await supabase.functions.invoke('update-content-entries-schema');
      } catch {
        // non-critical
      }

      // Silently check OpenAI API key
      try {
        const { data: keyData } = await supabase.functions.invoke('check-openai-key');
        if (keyData) console.log('OpenAI API key status:', keyData.status);
      } catch {
        // non-critical
      }

      setIsApiKeyChecked(true);
    };

    init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <CommandPalette />
            <Routes>
              <Route path="/" element={<PortfolioRedirect />} />
              <Route path="/projects" element={<PortfolioRedirect />} />
              <Route path="/about" element={<PortfolioRedirect />} />
              <Route path="/entries" element={<AllEntries />} />
              <Route path="/project/:id" element={<PortfolioRedirect />} />
              <Route path="/content/:id" element={<ContentDetail />} />
              <Route path="/experienceoasis" element={<ExperienceOasis />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Auth />} />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute requireAdmin={true}>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/admin/projects" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminProjects />
                </ProtectedRoute>
              } />
              <Route path="/admin/project/:id" element={
                <ProtectedRoute requireAdmin={true}>
                  <ProjectEditor />
                </ProtectedRoute>
              } />
              <Route path="/admin/content" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminContent />
                </ProtectedRoute>
              } />
              <Route path="/admin/content/:id" element={
                <ProtectedRoute requireAdmin={true}>
                  <ContentEditor />
                </ProtectedRoute>
              } />
              <Route path="/admin/prompts" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminPrompts />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminUsers />
                </ProtectedRoute>
              } />
              <Route path="/admin/about" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminAbout />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;


import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import AdminProjects from "./pages/AdminProjects"; 
import AdminContent from "./pages/AdminContent";
import AdminPrompts from "./pages/AdminPrompts";
import ProjectEditor from "./pages/ProjectEditor";
import ContentEditor from "./pages/ContentEditor";
import ProjectDetail from "./pages/ProjectDetail";
import ContentDetail from "./pages/ContentDetail";
import NotFound from "./pages/NotFound";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [isApiKeyChecked, setIsApiKeyChecked] = useState(false);
  
  // Setup database on first load
  useEffect(() => {
    const setupDb = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('setup-db');
        if (error) {
          console.error('Error setting up database:', error);
        } else {
          console.log('Database setup complete:', data);
        }
        
        // Update the content_entries schema
        try {
          const { data: schemaData, error: schemaError } = await supabase.functions.invoke('update-content-entries-schema');
          
          if (schemaError) {
            console.error('Error updating content entries schema:', schemaError);
          } else if (schemaData) {
            console.log('Content entries schema update:', schemaData);
          }
        } catch (error) {
          console.error('Error calling update-content-entries-schema function:', error);
        }
        
        // Silently check OpenAI API key without showing toasts
        try {
          const { data: keyData, error: keyError } = await supabase.functions.invoke('check-openai-key');
          
          if (keyError) {
            console.error('Error checking OpenAI key:', keyError);
          } else if (keyData) {
            console.log('OpenAI API key status:', keyData.status);
          }
          
          setIsApiKeyChecked(true);
        } catch (error) {
          console.error('Error checking OpenAI key:', error);
          setIsApiKeyChecked(true);
        }
      } catch (error) {
        console.error('Error in setup process:', error);
        setIsApiKeyChecked(true);
      }
    };
    
    setupDb();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/content/:id" element={<ContentDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/admin/projects" element={
                <ProtectedRoute>
                  <AdminProjects />
                </ProtectedRoute>
              } />
              <Route path="/admin/project/:id" element={
                <ProtectedRoute>
                  <ProjectEditor />
                </ProtectedRoute>
              } />
              <Route path="/admin/content" element={
                <ProtectedRoute>
                  <AdminContent />
                </ProtectedRoute>
              } />
              <Route path="/admin/content/:id" element={
                <ProtectedRoute>
                  <ContentEditor />
                </ProtectedRoute>
              } />
              <Route path="/admin/prompts" element={
                <ProtectedRoute>
                  <AdminPrompts />
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

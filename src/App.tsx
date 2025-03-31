import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { pineconeService } from './services/pinecone';
import { PINECONE_CONFIG } from './config/pinecone';
import { useToast } from './components/ui/use-toast';

const queryClient = new QueryClient();

const App = () => {
  const { toast } = useToast();

  useEffect(() => {
    const initializePinecone = async () => {
      try {
        await pineconeService.initialize(PINECONE_CONFIG);
        console.log('Pinecone initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Pinecone:', error);
        toast({
          title: "Pinecone Initialization Failed",
          description: "There was an error connecting to Pinecone. Please check your configuration.",
          variant: "destructive",
        });
      }
    };

    initializePinecone();
  }, [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from './lib/query';
import App from "./App.tsx";
import "./index.css";

const queryClient = getQueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initVisibilityWatcher } from '@/lib/visibility';
import { initAuthListener } from '@/lib/auth-listener';

initAuthListener();
initVisibilityWatcher();

createRoot(document.getElementById("root")!).render(<App />);

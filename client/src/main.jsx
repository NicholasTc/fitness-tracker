import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider.jsx";
import ThemeSync from "./components/ThemeSync.jsx";
import { applyThemeFromStorage } from "./lib/theme.js";
import "./index.css";
import "./styles/fitflow-tokens.css";
import "./styles/fitflow-theme-rose.css";
import App from "./App.jsx";

applyThemeFromStorage();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeSync />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

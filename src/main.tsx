import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./app/App";
import "./styles/layout.css";
import "./styles/components.css";

import "./styles/pages/home.css";
import "./styles/pages/products.css";
import "./styles/pages/services.css";
import "./styles/pages/technology.css";
import "./styles/pages/projects.css";
import "./styles/pages/blog.css";
import "./styles/pages/contact.css";
import "./styles/reset.css";
import "./styles/theme.css";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
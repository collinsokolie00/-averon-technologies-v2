import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Server-side Stripe and Emmy integrations are owned by apps/averon-api.
export default defineConfig({
  plugins: [react()],
});

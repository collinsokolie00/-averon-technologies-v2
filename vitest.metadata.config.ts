import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()], test: { environment: "jsdom", include: ["test/page-metadata.test.tsx", "test/page-content.test.tsx", "test/frontend-source-action.test.tsx"] } });

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./styles.css";
import "./chat-cleanup.css";

const requiredFirebaseValues = [
  import.meta.env.VITE_FIREBASE_API_KEY,
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  import.meta.env.VITE_FIREBASE_APP_ID,
];
const root = createRoot(document.getElementById("root")!);

if (requiredFirebaseValues.some((value) => !value?.trim())) {
  root.render(<main className="configuration-error"><h1>Emmy needs Firebase configuration</h1><p>Copy <code>apps/emmy-app/.env.example</code> to <code>apps/emmy-app/.env</code>, add the frontend Firebase values, and restart the app.</p></main>);
} else {
  const { default: App } = await import("./App");
  root.render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);
}

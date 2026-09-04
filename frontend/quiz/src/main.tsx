import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import "./index.css";
import App from "./App.tsx";
import { Provider } from "react-redux";
import { store } from "./store/store.tsx";

const domain = import.meta.env.VITE_AUTH0_DOMAIN || "dev-oz2aw2gea6l10gab.us.auth0.com";
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || "nozbtl9zVfqFJPeVZE6XfnjTAsOchVsy";
const audience = import.meta.env.VITE_AUTH0_AUDIENCE || "https://quiz-api.dev";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
      }}
    >
      <Provider store={store}>
        <App />
      </Provider>
    </Auth0Provider>
  </StrictMode>,
);

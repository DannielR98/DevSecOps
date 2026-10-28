import { ToastContainer } from "react-toastify";
import "./App.css";
import RouterPage from "./page/routes/RoutePage";
import { useAuth } from "./context/AuthContext";
import { useEffect } from "react";

function App() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth();

  useEffect(() => {
    const getToken = async () => {
      if (!isAuthenticated) {return;}

      try {
        const token = await getAccessTokenSilently();
        console.log("SUPABASE AUTH TOKEN:", token);
      } catch (err) {
        console.error("Token error:", err);
      }
    };

    getToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <>
      <ToastContainer />
      <RouterPage />
    </>
  );
}

export default App;

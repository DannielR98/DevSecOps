import { ToastContainer } from "react-toastify";
import "./App.css";
import RouterPage from "./page/routes/RoutePage";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
function App() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    const getToken = async () => {
      if (!isAuthenticated) return;

      const token = await getAccessTokenSilently();

      console.log("AUTH0 TOKEN:", token);
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

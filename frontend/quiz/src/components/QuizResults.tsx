import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import type { RootState } from "../store/store";
import { apiRequest } from "../utilities/HeaderFunction";

type View = "mine" | "leaderboard";
interface ResultScore {
  score: number;
  total_questions: number;
  percentage: number;
}

type Result = ResultScore & (
  | { id: string; createdAt: string }
  | { user_id: string; username: string; attempt_count: number }
);

interface Props {
  quizId: string;
  quizTitle: string;
  view: View;
  onClose: () => void;
}

export default function QuizResults({ quizId, quizTitle, view, onClose }: Props) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth();
  const reduxToken = useSelector((state: RootState) => state.authSlice.token);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = isAuthenticated ? await getAccessTokenSilently() : reduxToken;
        if (!token) { throw new Error("Du måste logga in för att se resultat."); }
        const response = await apiRequest({
          api: "quizzes",
          endpoint: `/${quizId}/results?view=${view}`,
          token,
        });
        if (active) { setResults(response.results); }
      } catch (err) {
        console.error("Error loading quiz results:", err);
        if (active) { setError("Kunde inte hämta resultaten. Försök igen."); }
      } finally {
        if (active) { setLoading(false); }
      }
    };
    void load();
    return () => { active = false; };
  }, [quizId, view, isAuthenticated, getAccessTokenSilently, reduxToken]);

  const heading = view === "mine" ? "Mina resultat" : "Deltagarnas bästa resultat";
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "1rem",
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="quiz-results-heading" style={{
        backgroundColor: "#fff", borderRadius: "12px", padding: "2rem",
        width: "100%", maxWidth: "600px", maxHeight: "85vh", overflowY: "auto",
      }}>
        <h2 id="quiz-results-heading">{heading}: {quizTitle}</h2>
        <p>{view === "mine"
          ? "Andel rätt vid varje genomförande."
          : "Deltagarnas bästa andel rätt och totalt antal försök, inklusive tidigare medlemmar."}</p>
        {loading ? <p role="status">Laddar resultat...</p> : error ? (
          <p role="alert">{error}</p>
        ) : results.length === 0 ? (
          <p>Inga resultat att visa ännu.</p>
        ) : (
          <div aria-label={heading}>
            {results.map((result, index) => {
              const label = "createdAt" in result
                ? `Försök ${index + 1} – ${new Date(result.createdAt).toLocaleString("sv-SE")}`
                : result.username;
              return (
                <div key={"id" in result ? result.id : result.user_id} style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <span>{label}</span>
                    <span>{result.score}/{result.total_questions} ({result.percentage}%)</span>
                  </div>
                  {"attempt_count" in result && (
                    <div>Totalt antal försök: {result.attempt_count}</div>
                  )}
                  <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100}
                    aria-valuenow={result.percentage}
                    style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "14px", marginTop: "0.3rem" }}>
                    <div style={{ backgroundColor: "#2563eb", borderRadius: "4px",
                      width: `${result.percentage}%`, height: "100%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button type="button" onClick={onClose} style={{
          padding: "0.6rem 1.5rem", backgroundColor: "#2563eb", color: "#fff",
          border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer",
        }}>Stäng</button>
      </section>
    </div>
  );
}

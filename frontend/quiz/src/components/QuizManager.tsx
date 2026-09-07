import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { apiRequest } from "../utilities/HeaderFunction";

interface QuestionItem {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizItem {
  id: number;
  title: string;
  category: string;
  group_id: number;
  group_name?: string;
  is_creator?: boolean;
  questions: QuestionItem[];
  createdAt: string;
}

interface GroupItem {
  id: number;
  name: string;
}

interface QuizManagerProps {
  refreshKey?: number;
}

export default function QuizManager({ refreshKey }: QuizManagerProps) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { isAuth, token: reduxToken } = useSelector(
    (state: RootState) => state.authSlice,
  );

  const isLoggedIn = isAuthenticated || isAuth;

  const getToken = async (): Promise<string> => {
    try {
      if (isAuthenticated) {
        return await getAccessTokenSilently();
      }
      return reduxToken || "";
    } catch {
      return reduxToken || "";
    }
  };

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<{ score: number; total_questions: number; percentage: number } | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category] = useState("DevSecOps");
  const [selectedGroupId, setSelectedGroupId] = useState<number | "">("");
  const [questions, setQuestions] = useState<QuestionItem[]>([
    { question: "", options: ["", "", "", ""], correctAnswer: 0 },
  ]);

  const resetFormState = () => {
    setTitle("");
    setEditingQuizId(null);
    setQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
  };

  const fetchData = async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const groupsData = await apiRequest({ api: "groups", method: "GET", token });
      const groupList = groupsData.groups || [];
      setGroups(groupList);
      if (groupList.length > 0 && selectedGroupId === "") {
        setSelectedGroupId(groupList[0].id);
      }

      const quizData = await apiRequest({ api: "quizzes", method: "GET", token });
      setQuizzes(quizData.quizzes || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated, isAuth, refreshKey]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question: "", options: ["", "", "", ""], correctAnswer: 0 },
    ]);
  };

  const handleRemoveQuestion = (qIndex: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, idx) => idx !== qIndex));
  };

  const handleQuestionChange = (index: number, field: string, value: unknown) => {
    const updated = [...questions];
    if (field === "question") updated[index].question = value as string;
    if (field === "correctAnswer") updated[index].correctAnswer = Number(value);
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedGroupId) return;

    try {
      const token = await getToken();
      if (editingQuizId) {
        await apiRequest({
          api: "quizzes",
          endpoint: `/${editingQuizId}`,
          method: "PUT",
          token,
          body: {
            title: title.trim(),
            category,
            group_id: Number(selectedGroupId),
            questions,
          },
        });
      } else {
        await apiRequest({
          api: "quizzes",
          method: "POST",
          token,
          body: {
            title: title.trim(),
            category,
            group_id: Number(selectedGroupId),
            questions,
          },
        });
      }
      resetFormState();
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error("Error saving quiz:", err);
    }
  };

  const handleDeleteQuiz = async (quizId: number, quizTitle: string) => {
    const confirmed = window.confirm(
      `Är du säker på att du vill ta bort quizet "${quizTitle}"?`
    );
    if (!confirmed) return;

    try {
      const token = await getToken();
      await apiRequest({
        api: "quizzes",
        endpoint: `/${quizId}`,
        method: "DELETE",
        token,
      });
      fetchData();
    } catch (err) {
      console.error("Error deleting quiz:", err);
    }
  };

  const startQuiz = (quiz: QuizItem) => {
    setActiveQuiz(quiz);
    setUserAnswers(new Array(quiz.questions.length).fill(-1));
    setQuizScore(null);
  };

  const handleSelectAnswer = (qIndex: number, optionIndex: number) => {
    const updated = [...userAnswers];
    updated[qIndex] = optionIndex;
    setUserAnswers(updated);
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    try {
      const token = await getToken();
      const data = await apiRequest({
        api: "quizzes",
        endpoint: `/${activeQuiz.id}/submit`,
        method: "POST",
        token,
        body: { answers: userAnswers },
      });
      setQuizScore(data.result);
    } catch (err) {
      console.error("Error submitting quiz:", err);
    }
  };

  const openCreateModal = async () => {
    resetFormState();
    try {
      const token = await getToken();
      if (token) {
        const groupsData = await apiRequest({ api: "groups", method: "GET", token });
        const groupList = groupsData.groups || [];
        setGroups(groupList);
        if (groupList.length > 0) {
          setSelectedGroupId((prev) => {
            const exists = groupList.some((g: GroupItem) => g.id === Number(prev));
            return exists ? prev : groupList[0].id;
          });
          setShowCreateModal(true);
        } else {
          alert("För att skapa ett quiz, skapa en grupp eller gå med i en via inbjudningskod ovan först!");
        }
      }
    } catch (err) {
      console.error("Error refreshing groups:", err);
    }
  };

  const openEditModal = (quiz: QuizItem) => {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title);
    setSelectedGroupId(quiz.group_id);
    setQuestions(
      quiz.questions && quiz.questions.length > 0
        ? JSON.parse(JSON.stringify(quiz.questions))
        : [{ question: "", options: ["", "", "", ""], correctAnswer: 0 }]
    );
    setShowCreateModal(true);
  };

  if (!isLoggedIn) return null;

  return (
    <div
      style={{
        marginTop: "2rem",
        padding: "1.5rem",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        maxWidth: "800px",
        margin: "2rem auto",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", color: "#111827", margin: 0 }}>
          🎯 Quiz
        </h2>
        <button
          onClick={openCreateModal}
          style={{
            padding: "0.6rem 1.2rem",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Skapa nytt quiz
        </button>
      </div>

      {/* Quiz List */}
      {loading ? (
        <p style={{ color: "#6b7280" }}>Laddar quiz...</p>
      ) : quizzes.length === 0 ? (
        <p style={{ color: "#6b7280", fontStyle: "italic" }}>
          Inga quiz tillgängliga ännu. Skapa en grupp och lägg till ditt första quiz!
        </p>
      ) : (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {quizzes.map((quiz) => {
            const groupName =
              quiz.group_name ||
              groups.find((g) => g.id === quiz.group_id)?.name ||
              quiz.category;

            return (
              <div
                key={quiz.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "1rem",
                  backgroundColor: "#f9fafb",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.6rem",
                      backgroundColor: "#dbeafe",
                      color: "#1e40af",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                    }}
                  >
                    👥 {groupName}
                  </span>
                  <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0", color: "#111827" }}>{quiz.title}</h3>
                  <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                    {quiz.questions?.length || 0} Frågor
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
                  <button
                    onClick={() => startQuiz(quiz)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Starta quiz 🚀
                  </button>
                  {quiz.is_creator && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => openEditModal(quiz)}
                        style={{
                          flex: 1,
                          padding: "0.4rem 0.6rem",
                          backgroundColor: "#f59e0b",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Redigera
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                        style={{
                          flex: 1,
                          padding: "0.4rem 0.6rem",
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Ta bort
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Quiz Player Modal */}
      {activeQuiz && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", color: "#111827", marginBottom: "0.5rem" }}>
              {activeQuiz.title}
            </h2>

            {quizScore ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <h3 style={{ fontSize: "2rem", color: "#10b981" }}>
                  Resultat: {quizScore.score} / {quizScore.total_questions} ({quizScore.percentage}%)
                </h3>
                <p style={{ color: "#4b5563", margin: "0.5rem 0 1.5rem 0" }}>
                  {quizScore.percentage >= 70 ? "🎉 Enastående resultat!" : "Bra kämpat! Fortsätt öva."}
                </p>
                <button
                  onClick={() => setActiveQuiz(null)}
                  style={{
                    padding: "0.6rem 1.5rem",
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Stäng
                </button>
              </div>
            ) : (
              <div>
                {activeQuiz.questions.map((q, qIdx) => (
                  <div key={qIdx} style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                    <p style={{ fontWeight: 600, color: "#1f2937", marginBottom: "0.75rem" }}>
                      {qIdx + 1}. {q.question}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {q.options.map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            backgroundColor: userAnswers[qIdx] === oIdx ? "#eff6ff" : "#fff",
                            borderColor: userAnswers[qIdx] === oIdx ? "#3b82f6" : "#d1d5db",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name={`q_${qIdx}`}
                            checked={userAnswers[qIdx] === oIdx}
                            onChange={() => handleSelectAnswer(qIdx, oIdx)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                  <button
                    onClick={() => setActiveQuiz(null)}
                    style={{
                      padding: "0.6rem 1.2rem",
                      backgroundColor: "#9ca3af",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={userAnswers.includes(-1)}
                    style={{
                      padding: "0.6rem 1.5rem",
                      backgroundColor: userAnswers.includes(-1) ? "#9ca3af" : "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: userAnswers.includes(-1) ? "not-allowed" : "pointer",
                    }}
                  >
                    Lämna in svar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Quiz Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", color: "#111827", marginBottom: "1rem" }}>
              {editingQuizId ? "Redigera quiz" : "Skapa nytt quiz"}
            </h2>
            <form onSubmit={handleSaveQuiz}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.25rem" }}>Quiztitel</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="t.ex. Grunderna i DevSecOps"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.25rem" }}>Målgrupp</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <h4 style={{ margin: "1.5rem 0 0.5rem 0" }}>Frågor</h4>
              {questions.map((q, qIdx) => (
                <div key={qIdx} style={{ padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "6px", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <label style={{ fontWeight: 600, color: "#1f2937" }}>
                      Fråga #{qIdx + 1}
                    </label>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        style={{
                          padding: "0.2rem 0.5rem",
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Ta bort fråga
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Skriv frågetext..."
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIdx, "question", e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", marginBottom: "0.5rem" }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    {q.options.map((opt, oIdx) => (
                      <input
                        key={oIdx}
                        type="text"
                        required
                        placeholder={`Alternativ ${oIdx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                        style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                      />
                    ))}
                  </div>
                  <label style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                    Rätt svar:
                    <select
                      value={q.correctAnswer}
                      onChange={(e) => handleQuestionChange(qIdx, "correctAnswer", e.target.value)}
                      style={{ marginLeft: "0.5rem", padding: "0.2rem" }}
                    >
                      {q.options.map((_, oIdx) => (
                        <option key={oIdx} value={oIdx}>
                          Alternativ {oIdx + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                style={{
                  padding: "0.4rem 1rem",
                  backgroundColor: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  marginBottom: "1.5rem",
                }}
              >
                + Lägg till en till fråga
              </button>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setShowCreateModal(false);
                  }}
                  style={{ padding: "0.6rem 1.2rem", backgroundColor: "#9ca3af", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.5rem", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
                >
                  {editingQuizId ? "Uppdatera quiz" : "Spara quiz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

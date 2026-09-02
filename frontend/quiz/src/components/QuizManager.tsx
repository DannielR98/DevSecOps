import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
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
  questions: QuestionItem[];
  createdAt: string;
}

interface GroupItem {
  id: number;
  name: string;
}

export default function QuizManager() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<{ score: number; total_questions: number; percentage: number } | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("DevSecOps");
  const [selectedGroupId, setSelectedGroupId] = useState<number | "">("");
  const [questions, setQuestions] = useState<QuestionItem[]>([
    { question: "", options: ["", "", "", ""], correctAnswer: 0 },
  ]);

  const fetchData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
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
  }, [isAuthenticated]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question: "", options: ["", "", "", ""], correctAnswer: 0 },
    ]);
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

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedGroupId) return;

    try {
      const token = await getAccessTokenSilently();
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
      setTitle("");
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error("Error creating quiz:", err);
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
      const token = await getAccessTokenSilently();
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

  if (!isAuthenticated) return null;

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
          🎯 Quizzes
        </h2>
        <button
          onClick={() => {
            if (groups.length === 0) {
              alert("To create a quiz, please create a group or join one using an invite code above first!");
            } else {
              setShowCreateModal(true);
            }
          }}
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
          + Create New Quiz
        </button>
      </div>

      {/* Quiz List */}
      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading quizzes...</p>
      ) : quizzes.length === 0 ? (
        <p style={{ color: "#6b7280", fontStyle: "italic" }}>
          No quizzes available yet. Create a group and add your first quiz!
        </p>
      ) : (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
                backgroundColor: "#f9fafb",
                display: "flex",
                flexDirection: "column",
                justify: "space-between",
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
                  {quiz.category}
                </span>
                <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0", color: "#111827" }}>{quiz.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  {quiz.questions?.length || 0} Questions
                </p>
              </div>
              <button
                onClick={() => startQuiz(quiz)}
                style={{
                  marginTop: "1rem",
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
                Take Quiz 🚀
              </button>
            </div>
          ))}
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
                  Score: {quizScore.score} / {quizScore.total_questions} ({quizScore.percentage}%)
                </h3>
                <p style={{ color: "#4b5563", margin: "0.5rem 0 1.5rem 0" }}>
                  {quizScore.percentage >= 70 ? "🎉 Outstanding Performance!" : "Good effort! Keep practicing."}
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
                  Close
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
                    Cancel
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
                    Submit Answers
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Quiz Modal */}
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
              Create New Quiz
            </h2>
            <form onSubmit={handleCreateQuiz}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.25rem" }}>Quiz Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DevSecOps Fundamentals"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.25rem" }}>Target Group</label>
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

              <h4 style={{ margin: "1.5rem 0 0.5rem 0" }}>Questions</h4>
              {questions.map((q, qIdx) => (
                <div key={qIdx} style={{ padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "6px", marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.25rem" }}>
                    Question #{qIdx + 1}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter question text..."
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
                        placeholder={`Option ${oIdx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                        style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                      />
                    ))}
                  </div>
                  <label style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                    Correct Answer:
                    <select
                      value={q.correctAnswer}
                      onChange={(e) => handleQuestionChange(qIdx, "correctAnswer", e.target.value)}
                      style={{ marginLeft: "0.5rem", padding: "0.2rem" }}
                    >
                      {q.options.map((_, oIdx) => (
                        <option key={oIdx} value={oIdx}>
                          Option {oIdx + 1}
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
                + Add Another Question
              </button>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "0.6rem 1.2rem", backgroundColor: "#9ca3af", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.6rem 1.5rem", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
                >
                  Save Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

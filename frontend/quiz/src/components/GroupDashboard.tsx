import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { apiRequest } from "../utilities/HeaderFunction";
import { createUseStyles } from "react-jss";

interface GroupItem {
  id: number;
  name: string;
  invite_code?: string;
  owner_id: number;
  is_owner?: boolean;
  createdAt: string;
}

interface GroupDashboardProps {
  onGroupChange?: () => void;
}
const useStyles = createUseStyles({
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1.5rem",

    "@media (max-width: 700px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export default function GroupDashboard({ onGroupChange }: GroupDashboardProps) {
  const classes = useStyles();

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
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === "object" && err !== null && "response" in err) {
      const res = (
        err as {
          response?: {
            data?: { message?: string; error?: string; sms?: string[] };
          };
        }
      ).response;
      if (res?.data?.message) return res.data.message;
      if (res?.data?.error) return res.data.error;
      if (res?.data?.sms && res.data.sms.length > 0) return res.data.sms[0];
    }
    if (err instanceof Error) return err.message;
    return "Ett fel uppstod. Försök igen.";
  };

  const fetchGroups = async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;
      const data = await apiRequest({
        api: "groups",
        method: "GET",
        token,
      });
      setGroups(data.groups || []);
    } catch (err: unknown) {
      console.error("Error loading groups:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [isAuthenticated, isAuth]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setError("");
    setSuccess("");

    try {
      const token = await getToken();
      await apiRequest({
        api: "groups",
        method: "POST",
        token,
        body: { name: groupName.trim() },
      });
      setGroupName("");
      setSuccess("Gruppen har skapats!");
      await fetchGroups();
      onGroupChange?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError("");
    setSuccess("");

    try {
      const token = await getToken();
      const res = await apiRequest({
        api: "groups/join",
        method: "POST",
        token,
        body: { invite_code: joinCode.trim() },
      });
      setJoinCode("");
      setSuccess(res.message || "Gick med i gruppen!");
      await fetchGroups();
      onGroupChange?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleEditGroup = async (groupId: number) => {
    if (!editName.trim()) return;
    try {
      const token = await getToken();
      await apiRequest({
        api: "groups",
        endpoint: `/${groupId}`,
        method: "PUT",
        token,
        body: { name: editName.trim() },
      });
      setEditingGroupId(null);
      setEditName("");
      await fetchGroups();
      onGroupChange?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteGroup = async (id: number, groupName: string) => {
    const confirmed = window.confirm(
      `Detta kommer att ta bort alla kopplade quiz i gruppen "${groupName}". Är du säker på att du vill ta bort gruppen?`,
    );
    if (!confirmed) return;

    try {
      const token = await getToken();
      await apiRequest({
        api: "groups",
        endpoint: `/${id}`,
        method: "DELETE",
        token,
      });
      setSuccess("Gruppen har tagits bort!");
      await fetchGroups();
      onGroupChange?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
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
        maxWidth: "700px",
        margin: "2rem auto 0 auto",
        textAlign: "left",
      }}
    >
      <h2
        style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#111827" }}
      >
        📚 Mina Quizgrupper
      </h2>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#d1fae5",
            color: "#065f46",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {success}
        </div>
      )}

      {/* Forms: Create Group & Join Group */}
      <div className={classes.gridContainer}>
        <form
          onSubmit={handleCreateGroup}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label
            style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}
          >
            Skapa ny grupp
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Gruppnamn..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.95rem",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Skapa
            </button>
          </div>
        </form>

        <form
          onSubmit={handleJoinGroup}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label
            style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}
          >
            Gå med via inbjudningskod
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="t.ex. EXAM24"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.95rem",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔑 Gå med
            </button>
          </div>
        </form>
      </div>

      {/* Group List */}
      {loading ? (
        <p style={{ color: "#6b7280" }}>Laddar dina grupper...</p>
      ) : groups.length === 0 ? (
        <p style={{ color: "#6b7280", fontStyle: "italic" }}>
          Inga grupper skapade eller anslutna ännu. Skapa en eller ange en
          inbjudningskod ovan!
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {groups.map((group) => (
            <li
              key={group.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.85rem 1rem",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                borderRadius: "6px",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ flex: 1 }}>
                {editingGroupId === group.id ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{
                        padding: "0.3rem 0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                      }}
                    />
                    <button
                      onClick={() => handleEditGroup(group.id)}
                      style={{
                        padding: "0.3rem 0.75rem",
                        backgroundColor: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Spara
                    </button>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      style={{
                        padding: "0.3rem 0.5rem",
                        backgroundColor: "#9ca3af",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <div>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "1.05rem",
                        color: "#1f2937",
                      }}
                    >
                      {group.name}
                    </span>
                    {group.is_owner && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.75rem",
                          padding: "0.1rem 0.4rem",
                          backgroundColor: "#dbeafe",
                          color: "#1e40af",
                          borderRadius: "4px",
                        }}
                      >
                        Ägare
                      </span>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        marginTop: "0.25rem",
                        fontSize: "0.8rem",
                        color: "#6b7280",
                      }}
                    >
                      {group.invite_code && (
                        <span>
                          🔑 Inbjudningskod:{" "}
                          <strong>{group.invite_code}</strong>
                        </span>
                      )}
                      <span>
                        Skapad:{" "}
                        {new Date(group.createdAt).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {group.is_owner && editingGroupId !== group.id && (
                  <button
                    onClick={() => {
                      setEditingGroupId(group.id);
                      setEditName(group.name);
                    }}
                    style={{
                      padding: "0.35rem 0.75rem",
                      backgroundColor: "#f59e0b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Redigera namn
                  </button>
                )}
                {group.is_owner && (
                  <button
                    onClick={() => handleDeleteGroup(group.id, group.name)}
                    style={{
                      padding: "0.35rem 0.75rem",
                      backgroundColor: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Ta bort
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

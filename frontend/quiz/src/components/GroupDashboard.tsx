import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import { apiRequest } from "../utilities/HeaderFunction";

interface GroupItem {
  id: number;
  name: string;
  invite_code?: string;
  owner_id: number;
  is_owner?: boolean;
  createdAt: string;
}

export default function GroupDashboard() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchGroups = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      const token = await getAccessTokenSilently();
      const data = await apiRequest({
        api: "groups",
        method: "GET",
        token,
      });
      setGroups(data.groups || []);
    } catch (err: unknown) {
      console.error("Error loading groups:", err);
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [isAuthenticated]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setError("");
    setSuccess("");

    try {
      const token = await getAccessTokenSilently();
      await apiRequest({
        api: "groups",
        method: "POST",
        token,
        body: { name: groupName.trim() },
      });
      setGroupName("");
      setSuccess("Group created successfully!");
      fetchGroups();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError("");
    setSuccess("");

    try {
      const token = await getAccessTokenSilently();
      const res = await apiRequest({
        api: "groups/join",
        method: "POST",
        token,
        body: { invite_code: joinCode.trim() },
      });
      setJoinCode("");
      setSuccess(res.message || "Joined group successfully!");
      fetchGroups();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleEditGroup = async (groupId: number) => {
    if (!editName.trim()) return;
    try {
      const token = await getAccessTokenSilently();
      await apiRequest({
        api: "groups",
        endpoint: `/${groupId}`,
        method: "PUT",
        token,
        body: { name: editName.trim() },
      });
      setEditingGroupId(null);
      setEditName("");
      fetchGroups();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      const token = await getAccessTokenSilently();
      await apiRequest({
        api: "groups",
        endpoint: `/${id}`,
        method: "DELETE",
        token,
      });
      fetchGroups();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
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
        maxWidth: "700px",
        margin: "2rem auto 0 auto",
        textAlign: "left",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#111827" }}>
        📚 My Quiz Groups (Circles)
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}>Create New Group</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Group Name..."
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
              + Create
            </button>
          </div>
        </form>

        <form onSubmit={handleJoinGroup} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}>Join via Invite Code</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="e.g. EXAM24"
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
              🔑 Join
            </button>
          </div>
        </form>
      </div>

      {/* Group List */}
      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading your groups...</p>
      ) : groups.length === 0 ? (
        <p style={{ color: "#6b7280", fontStyle: "italic" }}>
          No groups created or joined yet. Create one or enter an invite code above!
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
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ padding: "0.3rem 0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                    />
                    <button
                      onClick={() => handleEditGroup(group.id)}
                      style={{ padding: "0.3rem 0.75rem", backgroundColor: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      style={{ padding: "0.3rem 0.5rem", backgroundColor: "#9ca3af", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "1.05rem", color: "#1f2937" }}>
                      {group.name}
                    </span>
                    {group.is_owner && (
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", padding: "0.1rem 0.4rem", backgroundColor: "#dbeafe", color: "#1e40af", borderRadius: "4px" }}>
                        Owner
                      </span>
                    )}
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem", fontSize: "0.8rem", color: "#6b7280" }}>
                      {group.invite_code && (
                        <span>
                          🔑 Invite Code: <strong>{group.invite_code}</strong>
                        </span>
                      )}
                      <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
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
                    Edit Name
                  </button>
                )}
                {group.is_owner && (
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
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
                    Delete
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

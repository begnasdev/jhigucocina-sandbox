import { useEffect, useState } from "react";

import { getUsers, updateUserRole } from "../../services/userService";
import Navbar from "../../components/Navbar";

const ROLES = ["customer", "staff", "manager", "admin"];

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      loadUsers();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Provider administration</p>
            <h1>User Management</h1>
            <p className="muted">
              Promote or demote staff. Role changes take effect on the user's next session.
            </p>
          </div>
          <span className="pill">{users.length} user{users.length === 1 ? "" : "s"}</span>
        </div>

        {loading && (
          <div className="empty-state">Loading users…</div>
        )}

        {!loading && users.length === 0 && (
          <div className="empty-state">No users found yet.</div>
        )}

        {!loading && users.length > 0 && (
          <div className="grid cards">
            {users.map((user) => (
              <article className="card" key={user.id}>
                <span className={`pill${user.role === "admin" ? " warning" : ""}`}>
                  {user.role || "customer"}
                </span>
                <h3 style={{ margin: "10px 0 4px", wordBreak: "break-all" }}>
                  {user.email}
                </h3>
                <p className="muted" style={{ fontSize: ".82rem" }}>UID: {user.id}</p>

                <label className="field" style={{ marginTop: 12 }}>
                  <span>Role</span>
                  <select
                    className="form-select"
                    value={user.role || "customer"}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default UsersPage;

import { useEffect, useState } from "react";

import { getUsers, updateUserRole } from "../../services/userService";
import Navbar from "../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";

const ROLES = ["customer", "staff", "manager", "admin"];

function UsersPage() {
  const { t } = useLanguage();
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
            <p className="eyebrow">{t("um.eyebrow")}</p>
            <h1>{t("um.title")}</h1>
          </div>
          <span className="pill">{t("um.count", { count: users.length })}</span>
        </div>

        {loading && (
          <div className="empty-state">{t("um.loading")}</div>
        )}

        {!loading && users.length === 0 && (
          <div className="empty-state">{t("um.empty")}</div>
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
                <p className="muted" style={{ fontSize: ".82rem" }}>{t("um.uid")}: {user.id}</p>

                <label className="field" style={{ marginTop: 12 }}>
                  <span>{t("um.role")}</span>
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

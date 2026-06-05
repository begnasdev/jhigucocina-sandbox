import { useEffect, useState } from "react";

import {
  getUsers,
  updateUserRole,
} from "../../services/userService";

function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRoleChange = async (
    userId,
    role
  ) => {
    try {
      await updateUserRole(userId, role);
      loadUsers();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>User Management</h1>

      {users.map((user) => (
        <div
          key={user.id}
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            marginBottom: "10px",
            borderRadius: "8px",
          }}
        >
          <p>
            <strong>Email:</strong>{" "}
            {user.email}
          </p>

          <p>
            <strong>Role:</strong>{" "}
            {user.role}
          </p>

          <select
            value={user.role}
            onChange={(e) =>
              handleRoleChange(
                user.id,
                e.target.value
              )
            }
          >
            <option value="customer">
              Customer
            </option>

            <option value="staff">
              Staff
            </option>

            <option value="manager">
              Manager
            </option>

            <option value="admin">
              Admin
            </option>
          </select>
        </div>
      ))}
    </div>
  );
}

export default UsersPage;
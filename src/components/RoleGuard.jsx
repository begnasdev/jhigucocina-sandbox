import { useAuth } from "../context/AuthContext";

export default function RoleGuard({
  allowedRoles,
  children,
}) {
  const { user } = useAuth();

  console.log("USER:", user);
  console.log("ROLE:", user?.role);
  console.log("ALLOWED:", allowedRoles);

  if (!user) {
    return <h2>Please login</h2>;
  }

  if (!allowedRoles.includes(user.role)) {
    return <h2>Access Denied</h2>;
  }

  return children;
}
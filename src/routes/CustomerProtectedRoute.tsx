import { Navigate, Outlet, useLocation } from "react-router";

import { useCustomerAuth } from "../contexts/useCustomerAuth";

export default function CustomerProtectedRoute() {
  const location = useLocation();
  const { loading, user } = useCustomerAuth();

  if (loading) {
    return <div className="route-loading">Loading your Averon account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

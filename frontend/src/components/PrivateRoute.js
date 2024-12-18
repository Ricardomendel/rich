// frontend/src/components/PrivateRoute.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const isBoss = user && user.role === "boss";
  const location = useLocation();

  const [protectedRoutes] = React.useState(["/users"]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isBoss && protectedRoutes.includes(location.pathname)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;

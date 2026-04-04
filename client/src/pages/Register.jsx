import { Navigate } from "react-router-dom";

/** Design uses a single landing with modal; keep route for old links. */
export default function Register() {
  return <Navigate to="/login?signup=1" replace />;
}

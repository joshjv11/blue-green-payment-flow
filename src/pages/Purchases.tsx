import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Purchases() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/purchases-v2", { replace: true });
  }, [navigate]);

  return (
    <div className="container mx-auto p-6">
      <p>Redirecting to Purchases V2...</p>
    </div>
  );
}

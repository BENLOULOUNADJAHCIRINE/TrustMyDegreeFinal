import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Student() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "STUDENT") {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div>
      <Outlet />
    </div>
  );
}

export default Student;
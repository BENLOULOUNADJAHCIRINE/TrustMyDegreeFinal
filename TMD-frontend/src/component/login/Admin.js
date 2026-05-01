import styles from "./admin.module.css";
import Navbar from "../admin/Navbar";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Admin() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className={styles.admin}>
      <div className={styles.nav}>
        <Navbar />
      </div>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

export default Admin;
import styles from "./dashboard.module.css";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
const BASE_URL = "http://localhost:5000";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [user, setUser] = useState([]);

  const token = localStorage.getItem("token");

  // Get user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.role === "ADMIN"
        ? setUser({ name: "Admin", email: parsed.email })
        : setUser({ name: "Super Admin", email: "" });
    }
  }, []);

  // Get dashboard stats
  useEffect(() => {
    fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setActivities(data.recentActivity || []);
      })
      .catch((err) => console.log(err));
  }, [token]);

  function handleSync() {
    fetch(`${BASE_URL}/api/admin/sync-students`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("SYNC DONE:", data);
        // setStatusMsg(`Students created: ${ data.created } , skipped: ${data.skipped}`);
        // Set on-page message instead of alert
        toast.success(
          `Students created: ${data.created} , skipped: ${data.skipped}`,
        );
      })
      .catch((err) => {
        console.log(err);
        toast.error("Failed to sync students");
      });
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Dashboard</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img src={user?.avatar || "/totalcertaficates.png"} alt="ava" />
        </div>
      </div>

      {/* Dashboard Row */}
      <div className={styles.row}>
        <div className={styles["total-certificates"]}>
          <img src="/totalcertaficates.png" alt="cer" />
          <h5>Total Certificates Issued</h5>
          <h2>{stats ? stats.totalCertificates : "..."}</h2>
        </div>

        <div className={styles["active-certificates"]}>
          <img src="/activecert.png" alt="act" />
          <h5>Active Certificates</h5>
          <h2>{stats ? stats.activeCertificates : "..."}</h2>
        </div>

        <div className={styles["revoked-certificates"]}>
          <img src="/revokedcert.png" alt="rev" />
          <h5>Revoked Certificate</h5>
          <h2>{stats ? stats.revokedCertificates : "..."}</h2>
        </div>

        <div className={styles["verifications"]}>
          <img src="/verifycert.png" alt="ver" />
          <h5>Verifications (30 days)</h5>
          <h2>{stats ? stats.totalVerifications : "..."}</h2>
        </div>
      </div>

      <div className={styles.history}>
        <div className={styles.card}>
          <div className={styles.title}>
            <img src="/histoy.png" alt="his" />
            <h5>Recent Activity</h5>
          </div>
          <div className={styles["activity-list"]}>
            {activities.length > 0 ? (
              activities.map((act, index) => (
                <div key={index} className={styles["activity-item"]}>
                  <div className={styles.leftside}>
                    <img src="/stdicon.jpg" alt="stdicon" />
                    <div className={styles.codename}>
                      <h5>{act.student?.fullName || "Student"}</h5>
                      <p>{act.uniqueCode}</p>
                    </div>
                  </div>
                  <div className={styles.rightside}>
                    <p>
                      {act.issueDate
                        ? new Date(act.issueDate)
                            .toLocaleDateString("fr-FR")
                            .replaceAll("/", "-")
                        : "Invalid Date"}
                    </p>
                    <span
                      className={`${styles.status} ${act.type === "INTERNSHIP" ? styles.internship : act.type === "MASTER" ? styles.master : act.type === "ENGINEER" ? styles.engineer : ""}`}
                    >
                      {act.type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>No recent activities</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles["quick-actions"]}>
        {/* <div className={styles.sync}>
          <button onClick={handleSync}>Sync students</button>
        </div> */}

        {/* SUCCESS/ERROR MESSAGE BANNER */}
        {/* {statusMsg && <div className={styles.successBanner}>{statusMsg}</div>} */}

        <div>
          <h5>sync students</h5>
          <div className={styles.actions}>
            <div className={styles.ho}>
              <img
                src="/add.png"
                alt="sync"
                onClick={handleSync}
                className={styles.add}
              />

              <h3>Sync students</h3>
            </div>
            <img src="/chapeau.png" alt="chapeau" className={styles.chap} />
          </div>
        </div>

        <div>
          <h5>Quick Actions</h5>
          <div className={styles.actions}>
            <div className={styles.ho}>
              <Link to="/admin/add">
                <img src="/add.png" alt="add" className={styles.add} />
              </Link>
              <h3>Issue New Certificate</h3>
            </div>
            <img src="/chapeau.png" alt="chapeau" className={styles.chap} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

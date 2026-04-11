import styles from "./dashboard.module.css";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Dashboard() {
  const [stats, setStats] = useState(null); // State to hold dashboard data
  const [activities, setActivities] = useState([]); // State to hold recent activities
  const [user, setUser] = useState(null); //state for the profile

  useEffect(() => {
    fetch("http://localhost:5000/api/auth/user", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }) // fetch the user who logged in
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setStats(data); // → totalCertificates, activeCertificates, revokedCertificates, verifications
        setActivities(data.recentActivity); // → recent activity list
      });
  }, []);

  function handleSync() {
    fetch("http://localhost:5000/api/admin/sync-students", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("SYNC DONE:", data);
        alert("Students synced successfully");
      })
      .catch((err) => {
        console.log(err);
        alert("Sync failed");
      });
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Dashboard</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>{" "}
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
          <h2>{stats ? stats.totalCertificates : "..."}</h2>{" "}
          {/*Display total certificates from stats or show "..." if stats is not loaded yet*/}
        </div>

        <div className={styles["active-certificates"]}>
          <img src="/activecert.png" alt="act" />
          <h5>Active Certificates</h5>
          <h2>{stats ? stats.activeCertificates : "..."}</h2>{" "}
          {/*Display active certificates from stats or show "..." if stats is not loaded yet*/}
        </div>

        <div className={styles["revoked-certificates"]}>
          <img src="/revokedcert.png" alt="rev" />
          <h5>Revoked Certificate</h5>
          <h2>{stats ? stats.revokedCertificates : "..."}</h2>{" "}
          {/*Display revoked certificates from stats or show "..." if stats is not loaded yet*/}
        </div>
        <div className={styles["verifications"]}>
          <img src="/verifycert.png" alt="ver" />
          <h5>Verifications</h5>
          <h2>{stats ? stats.totalVerifications : "..."}</h2>{" "}
          {/*Display verifications from stats or show "..." if stats is not loaded yet*/}
        </div>
      </div>

      {/*Recent Activity and history*/}
      <div className={styles.history}>
        <div className={styles.card}>
          <div className={styles.title}>
            <img src="/histoy.png" alt="his" />
            <h5>Recent Activity</h5>
          </div>
          <div className={styles["activity-list"]}>
            {activities.length > 0 ? (
              activities.map((act) => (
                <div key={act.id} className={styles["activity-item"]}>
                  {" "}
                  {/*Display activity details here, e.g. act.type, act.timestamp, etc.*/}
                  <div className={styles.leftside}>
                    <img src="/stdicon.jpg" alt="atdicon" />
                    <div className={styles.codename}>
                      <h5>{act.student?.fullName}</h5>
                      <p>{act.uniqueCode}</p>
                    </div>
                  </div>
                  <div className={styles.rightside}>
                    <p>
                      {new Date(act.issueDate)
                        .toLocaleDateString("fr-FR")
                        .replaceAll("/", "-")}
                    </p>

                    <span
                      className={`${styles.status} ${
                        act.status.toLowerCase() === "active"
                          ? styles.issued
                          : act.status.toLowerCase() === "revoked"
                            ? styles.revoked
                            : act.status.toLowerCase() === "verified"
                              ? styles.verified
                              : ""
                      }`}
                    >
                      {" "}
                      {act.status}
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

      {/* Quick Actions*/}
      <div className={styles["quick-actions"]}>
        <div className={styles.sync}>
          <button onClick={handleSync}>Sync students</button>
        </div>

        <div>
          <h5>Quick Actions</h5>
          <div className={styles.actions}>
            <div className={styles.ho}>
              <Link to="/admin/add">
                <img src="/add.png" alt="add" className={styles.add} />
              </Link>
              <h3>Issue New Certeficate</h3>
            </div>
            <img src="/chapeau.png" alt="chapeau" className={styles.chap} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

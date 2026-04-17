import styles from "./Param.module.css";
import { useState, useEffect } from "react";

function Parameters() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // NEW: State for on-page messages
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/auth/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setName(data.fullName || "");
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setStatusMsg({ text: "", type: "" }); // Reset message

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg({ text: "Passwords do not match", type: "error" });
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatusMsg({ text: "Profile updated successfully!", type: "success" });
        setUser({ ...user, fullName: name });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setStatusMsg({ text: data.message || "Update failed", type: "error" });
      }
    } catch (err) {
      setStatusMsg({ text: "Server connection error", type: "error" });
    }
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Parameters</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.fullName : "Admin"}</h4>
            <p>{user ? user.email : "admin@ensta.edu.dz"}</p>
          </div>
          <img src={user?.avatar || "/totalcertaficates.png"} alt="ava" />
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* ON-PAGE MESSAGE RENDERING */}
        {statusMsg.text && (
          <div className={`${styles.message} ${styles[statusMsg.type]}`}>
            {statusMsg.text}
          </div>
        )}

        <div className={styles.platform}>
          <div className={styles.titles}>
            <h3>Platform Settings</h3>
            <p>Configure your dashboard and personal details.</p>
          </div>
          <div className={styles.buttons}>
            <button type="button" className={styles.b1} onClick={() => setName(user.fullName)}>Discard</button>
            <button type="submit" className={styles.b2}>Save Changes</button>
          </div>
        </div>

        <div className={styles.settings}>
          <div className={styles.container}>
            <div className={styles.name}>
              <div><label>Full Name</label></div>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter full name"
              />
            </div>

            <hr className={styles.hr} />

            <div className={styles.psw}><h4>Change Password</h4></div>
            <div className={styles.password}>
              <label>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>

            <div className={styles.change}>
              <div className={styles.new}>
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className={styles.confirm}>
                <label>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Parameters;
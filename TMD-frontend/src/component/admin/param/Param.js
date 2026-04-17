import styles from "./Param.module.css";
import { useState, useEffect } from "react";

function Parameters() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/auth/user", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((response) => response.json())
      .then((data) => setUser(data))
      .catch((err) => console.log(err));
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    console.log("sumbit called");

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    fetch("http://localhost:5000/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then((reponse) => reponse.json())
      .then((data) => {
        console.log(data);
        alert("Password updated successfully!");

        // Clear passwords
        setName("");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      })
      .catch((err) => console.log(err));
  }

  function handleDiscard() {
    setName("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Parameters</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>{" "}
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img src={user?.avatar || "/totalcertaficates.png"} alt="ava" />
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.platform}>
          <div className={styles.titles}>
            <h3>Platform Settings</h3>
            <p>
              Configure your dashboard experience and global system parameters.
            </p>
          </div>

          <div className={styles.buttons}>
            <button type="button" className={styles.b1} onClick={handleDiscard}>
              Discard Changes
            </button>
            <button type="submit" className={styles.b2}>
              Save Changes
            </button>
          </div>
        </div>

        <div className={styles.settings}>
          <div className={styles.top}>
            <h3>Profile Settings</h3>
            <p>Manage your administrator account details and security.</p>
          </div>

          <div className={styles.container}>
            <div className={styles.name}>
              <div>
                <img src="/person.png" alt="person" />
                <label>Full Name</label>
              </div>
              <input
                type="text"
                value={name}
                placeholder="enter yout name"
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <hr className={styles.hr} />

            <div className={styles.psw}>
              <img src="/password.png" alt="password" />
              <h4> change password</h4>
            </div>
            <div className={styles.password}>
              <label>Current PassWord</label>
              <input
                type="password"
                value={currentPassword}
                placeholder=" your current password"
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className={styles.change}>
              <div className={styles.new}>
                <label>New PassWord</label>
                <input
                  type="password"
                  value={newPassword}
                  placeholder=" new password"
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className={styles.confirm}>
                <label>Confirm New PassWord</label>
                <input
                  type="password"
                  value={confirmPassword}
                  placeholder=" confirm password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Parameters;

import styles from "./Settings.module.css";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { toast } from "react-hot-toast";

function Settings() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    api
      .get("/student/dashboard")
      .then((res) => {
        setUser({ name: res.data.fullName, isGraduated: res.data.isGraduated, avatar: res.data.avatar });
        if (res.data.avatar) setAvatarPreview(`http://localhost:5000${res.data.avatar}`);
      })
      .catch((err) => console.log(err));
  }, []);

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleAvatarUpload() {
    if (!avatarFile) {
      toast.error("Please select an image first");
      return;
    }
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("avatar", avatarFile);
    try {
      const res = await fetch("http://localhost:5000/api/student/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      toast.success("Profile picture updated!");
      setAvatarFile(null);
      setUser((prev) => ({ ...prev, avatar: data.avatar }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    console.log("sumbit called");

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    fetch("http://localhost:5000/api/student/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then((reponse) => reponse.json())
      .then((data) => {
        console.log(data);
        toast.success("Password updated successfully!");

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

  const navigate = useNavigate();

  // log out function
  const handleLogout = () => {
    localStorage.removeItem("token"); // remove auth
    navigate("/", { replace: true }); //remove the browser back button open paltform.
  };

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <div className={styles.image}>
          <img
            src="/setting.png"
            alt="setting"
            onClick={() => setOpenMenu(!openMenu)}
            className={openMenu ? styles.rotate : ""}
          />
          {openMenu && (
            <div className={styles.menu}>
              <ul className={styles.list}>
                <li>
                  <Link to="/student/RequestStudent">Request</Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className={styles.info}>
          <img
            src={avatarPreview || "/totalcertaficates.png"}
            alt="ava"
            className={styles.student}
          />
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>
            <p>{user?.isGraduated ? "Graduated ✅" : "Not graduated yet"}</p>
          </div>
          <img
            src="/exit.png"
            alt="exit"
            onClick={handleLogout}
            className={styles.exit}
          />
        </div>
      </div>

      <div className={styles.backto}>
        <Link to="/student/DashboardStudent">&larr; Back to Dashboard</Link>
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
            <p>Manage your  account details and security.</p>
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

            <hr className={styles.hr} />

            <div className={styles.psw}>
              <img src="/person.png" alt="avatar" />
              <h4>Profile Picture</h4>
            </div>

            <div className={styles.avatarSection}>
              <div className={styles.avatarPreviewWrap}>
                <img
                  src={avatarPreview || "/totalcertaficates.png"}
                  alt="profile preview"
                  className={styles.avatarPreview}
                />
                {avatarFile && <span className={styles.avatarNewBadge}>New</span>}
              </div>

              <div className={styles.avatarControls}>
                <label className={styles.avatarLabel} htmlFor="avatarInput">
                  Choose Image
                </label>
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className={styles.avatarInput}
                />
                <p className={styles.avatarHint}>JPEG, PNG, WebP or GIF · max 3MB</p>
                {avatarFile && (
                  <button
                    type="button"
                    className={styles.avatarUploadBtn}
                    onClick={handleAvatarUpload}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? "Uploading…" : "Save Picture"}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </form>

      <div className={styles.bottom}>
        <h4>Secured by TrustMyDegree Protocol • </h4>
      </div>
    </div>
  );
}

export default Settings;

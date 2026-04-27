import styles from "./Param.module.css";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
function Parameters() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.role === "ADMIN"
        ? setUser({ name: "Admin", email: parsed.email, avatar: parsed.avatar || null })
        : setUser({ name: "Super Admin", email: parsed.email, avatar: parsed.avatar || null });
      if (parsed.avatar) setAvatarPreview(`${process.env.REACT_APP_API_URL}${parsed.avatar}`);
    }
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
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      toast.success("Profile picture updated!");
      setAvatarFile(null);
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        localStorage.setItem("user", JSON.stringify({ ...parsed, avatar: data.avatar }));
      }
      setUser((prev) => ({ ...prev, avatar: data.avatar }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Profile updated successfully!");
        setUser({ ...user, fullName: name });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (err) {
      toast.error("Server connection error");
    }
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Parameters</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "Admin"}</h4>
            <p>{user ? user.email : "admin@ensta.edu.dz"}</p>
          </div>
          <img src={avatarPreview || "/totalcertaficates.png"} alt="ava" />
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* ON-PAGE MESSAGE RENDERING */}
        {/* {statusMsg.text && (
          <div className={`${styles.message} ${styles[statusMsg.type]}`}>
            {statusMsg.text}
          </div>
        )} */}

        <div className={styles.platform}>
          <div className={styles.titles}>
            <h3>Platform Settings</h3>
            <p>Configure your dashboard and personal details.</p>
          </div>
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.b1}
              onClick={() => {
                setName(user.fullName || "");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Discard
            </button>
            <button type="submit" className={styles.b2}>
              Save Changes
            </button>
          </div>
        </div>

        <div className={styles.settings}>
          <div className={styles.container}>
            <div className={styles.name}>
              <div>
                <label>Full Name</label>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <hr className={styles.hr} />

            <div className={styles.psw}>
              <h4>Change Password</h4>
            </div>
            <div className={styles.password}>
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className={styles.change}>
              <div className={styles.new}>
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className={styles.confirm}>
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <hr className={styles.hr} />

            <div className={styles.psw}>
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
    </div>
  );
}

export default Parameters;

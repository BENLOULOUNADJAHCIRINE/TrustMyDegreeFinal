import styles from "./authorisation.module.css";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

function Authorisations() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const BASE_URL = process.env.REACT_APP_API_URL;
  const token = localStorage.getItem("token");

  // Get logged in user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.role !== "SUPER_ADMIN") {
        alert("Access denied");
        window.location.href = "/admin/dashboard";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  // Get all admins
  useEffect(() => {
    fetch(`${BASE_URL}/api/superadmin/admins`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((resp) => resp.json())
      .then((data) => setAdmins(data))
      .catch((err) => console.log(err));
  }, [BASE_URL, token]);

  // Add admin
  function addAdmin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    fetch(`${BASE_URL}/api/superadmin/admins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.message === "Admin created , data to email") {
          setAdmins((prev) => [...prev, { id: Date.now(), email }]);
          setEmail("");
          setMessage("Admin created successfully! Password sent to email.");
        } else {
          setMessage(data.message);
        }
        setLoading(false);
      })
      .catch((err) => {
        window.alert(err);
        setLoading(false);
      });
  }

  // Delete admin
  function deleteAdmin(id) {
    toast(
      (t) => (
        <div className={styles.toastConfirm}>
          <span>Are you sure you want to delete this admin?</span>
          <div className={styles.toastButtons}>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                fetch(`${BASE_URL}/api/superadmin/admins/${id}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((resp) => resp.json())
                  .then(() => {
                    setAdmins((prev) =>
                      prev.filter((admin) => admin.id !== id),
                    );
                    toast.success("Admin deleted successfully!");
                  })
                  .catch((err) => toast.error("Failed to delete admin"));
              }}
            >
              Confirm
            </button>
            <button onClick={() => toast.dismiss(t.id)}>Cancel</button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <div className={styles.page}>
          <h4>Manage admins</h4>
        </div>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.fullName : "guest"}</h4>
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img
            src={user?.avatar ? user.avatar : "/totalcertaficates.png"}
            alt="avatar"
          />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.title}>
            <h3>Admin Management</h3>
            <p>Manage admins and their platform access</p>
          </div>

          {/* Success/Error message */}
          {message && (
            <p style={{ color: "green", marginBottom: "10px" }}>{message}</p>
          )}

          <form className={styles.search} onSubmit={addAdmin}>
            <div>
              <img src="/imgadm.png" alt="adm" />
              <input
                type="email"
                placeholder="admin email..."
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <input
              type="submit"
              value={loading ? "Adding..." : "add admin"}
              disabled={loading}
            />
          </form>

          <div className={styles.scroll}>
            {admins.length > 0 ? (
              admins.map((adm) => (
                <div className={styles.admin} key={adm.id}>
                  <div className={styles.left}>
                    <img
                      src={
                        adm.avatar
                          ? `${process.env.REACT_APP_API_URL}${adm.avatar}`
                          : "/email.png"
                      }
                      alt="pic"
                    />
                    <h3>{adm.email}</h3>
                  </div>
                  <div className={styles.right}>
                    <img
                      src="/delete.png"
                      alt="delete"
                      onClick={() => deleteAdmin(adm.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <h3>No admins found</h3>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Authorisations;

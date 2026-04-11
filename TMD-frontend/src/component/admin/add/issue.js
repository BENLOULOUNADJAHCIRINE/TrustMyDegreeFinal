import styles from "./issue.module.css";
import { useState } from "react";
import { useEffect } from "react";
import api from "../../../api";

function Issue() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ date: "", file: null });
  const [fileKey, setFileKey] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // ✅ get user info from dashboard instead
    api.get("/admin/dashboard")
      .then((res) => {
        setUser({ name: "Admin", email: localStorage.getItem("email") || "" });
      })
      .catch((err) => console.log(err));
  }, []);

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === "file") {
      setFormData({ ...formData, file: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  }

  function handleReset() {
    setFormData({ date: "", file: null });
    setFileKey((k) => k + 1);
    setSuccess("");
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (!formData.file) {
      setError("Please upload an Excel file");
      return;
    }
    if (!formData.date) {
      setError("Please select a graduation date");
      return;
    }

    const form = new FormData();
    form.append("graduationDate", formData.date);
    form.append("excel", formData.file); // ✅ backend expects "excel"

    try {
      const res = await api.post("/admin/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(`✅ ${res.data.created} certificates issued successfully!`);
      handleReset();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <div className={styles.page}>
          <h4>Issue Certificate</h4>
        </div>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img src="/totalcertaficates.png" alt="avatar" />
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.top}>
            <img className={styles.a} src="/greenissue.png" alt="green" />
            <div className={styles.hp}>
              <h3>ISSUE A NEW CERTIFICATE</h3>
              <p>CertiChain Academic Authentication Platform</p>
            </div>
            <img className={styles.f} src="/vector.png" alt="vect" />
          </div>

          <form className={styles.send} onSubmit={handleSubmit}>
            <div className={styles.firstrow}>
              <div className={styles.slach}>
                <img src="/slach.png" alt="slash" />
                <h2 className={styles.h2}>Certificate Details</h2>
              </div>

              <div className={styles.date}>
                <label>Date of Completion</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.slach}>
                <img src="/slach.png" alt="slash" className={styles.img} />
                <h2 className={styles.h2}>Export excel file</h2>
              </div>
            </div>

            {success && <p style={{ color: "green", textAlign: "center" }}>{success}</p>}
            {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

            <div className={styles.sndrow}>
              <div className={styles.upload}>
                <img src="/hand.png" alt="file" className={styles.hand} />
                <label className={styles.lab}>Drag & drop xlxs.file</label>
                <input
                  className={styles.file}
                  type="file"
                  name="file"
                  key={fileKey}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.buts}>
              <button className={styles.cancle} type="button" onClick={handleReset}>
                Cancel
              </button>
              <input className={styles.issue} type="submit" value="ISSUE CERTIFICATE" />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Issue;
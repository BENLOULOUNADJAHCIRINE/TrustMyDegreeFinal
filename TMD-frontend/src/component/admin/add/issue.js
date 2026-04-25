import styles from "./issue.module.css";
import { useState } from "react";
import { useEffect } from "react";
import api from "../../../api";
import { toast } from "react-hot-toast";
function Issue() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    file: null,
    templateType: "diploma",
  });
  const [fileKey, setFileKey] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // get user info from dashboard instead
    api
      .get("/admin/dashboard")
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
      toast.error("Please upload an Excel file");
      return;
    }
    if (!formData.date) {
      toast.rror("Please select a graduation date");
      return;
    }

    const form = new FormData();
    form.append("graduationDate", formData.date);
    form.append("excel", formData.file);
    form.append("templateType", formData.templateType);

    try {
      const res = await api.post("/admin/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("RESPONSE:", res.data);
      toast.success(` ${res.data.created} certificates issued successfully!`);
      handleReset();
    } catch (err) {
      console.log("ERROR:", err.response?.data);
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Issue Documents</h4>

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
              <h3>ISSUE A NEW DOCUMENT</h3>
              <p>TrustMyDegree Academic Authentication Platform</p>
            </div>
            <img className={styles.f} src="/vector.png" alt="vect" />
          </div>

          <form className={styles.send} onSubmit={handleSubmit}>
            {/* Template selector — moved inside the white form */}
            <div className={styles.slach}>
              <img src="/slach.png" alt="slash" />
              <h2 className={styles.h2}>Choose Template</h2>
            </div>

            <div className={styles.date}>
              <label>Document Type</label>
              <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="templateType"
                    value="diploma"
                    checked={formData.templateType === "diploma"}
                    onChange={(e) =>
                      setFormData({ ...formData, templateType: e.target.value })
                    }
                  />
                  Certificate of Achievement
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="templateType"
                    value="scolarite"
                    checked={formData.templateType === "scolarite"}
                    onChange={(e) =>
                      setFormData({ ...formData, templateType: e.target.value })
                    }
                  />
                  School Certificate
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="templateType"
                    value="internship"
                    checked={formData.templateType === "internship"}
                    onChange={(e) =>
                      setFormData({ ...formData, templateType: e.target.value })
                    }
                  />
                  Internship Certificate
                </label>
              </div>
            </div>

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

            <div className={styles.sndrow}>
              <div
                className={`${styles.upload} ${formData.file ? styles.uploadReady : ""}`}
              >
                <div className={styles.uploadIcon}>
                  {formData.file ? "✅" : ""}
                </div>
                <label className={styles.lab}>
                  {formData.file
                    ? formData.file.name
                    : "Drag & drop .xlsx file here"}
                </label>
                {formData.file ? (
                  <span className={styles.fileSize}>
                    {(formData.file.size / 1024).toFixed(1)} KB · Click to
                    replace
                  </span>
                ) : (
                  <span className={styles.fileSize}>
                    or click to browse your files
                  </span>
                )}
                <input
                  className={styles.file}
                  type="file"
                  name="file"
                  key={fileKey}
                  onChange={handleChange}
                />
              </div>
            </div>

            {success && (
              <div className={styles.successBanner}>
                <span className={styles.successIcon}>🎓</span>
                <div className={styles.successText}>
                  <strong>Success!</strong>
                  <span>{success}</span>
                </div>
              </div>
            )}
            {error && (
              <div className={styles.errorBanner}>
                <span className={styles.errorIcon}>⚠️</span>
                <div className={styles.errorText}>
                  <strong>Error</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className={styles.buts}>
              <button
                className={styles.cancle}
                type="button"
                onClick={handleReset}
              >
                Cancel
              </button>
              <input
                className={styles.issue}
                type="submit"
                value="ISSUE CERTIFICATE"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Issue;

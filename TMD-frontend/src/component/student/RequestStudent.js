import styles from "./RequestStudent.module.css";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import toast, { Toaster } from "react-hot-toast";
function RequestStudent() {
  const editorRef = useRef(null);
  const [user, setUser] = useState(null);
  const [doc, setDoc] = useState("");
  const [reason, setReason] = useState("");
  const [delivery, setDelivery] = useState("");

  const [priority, setPriority] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/student/dashboard")
      .then((res) => {
        setUser({ name: res.data.fullName, isGraduated: res.data.isGraduated, avatar: res.data.avatar || null });
      })
      .catch((err) => console.log(err));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess("");
    setError("");
    try {
      await api.post("/student/requests", {
        documentType: doc,
        reason,
        delivery: delivery.toUpperCase(),
        priority: priority.toUpperCase(),
      });
      toast.success("Request submitted successfully!");
      setDoc("");
      setReason("");
      setDelivery("");
      setPriority("");
      if (editorRef.current) editorRef.current.textContent = "";
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  }

  function clear() {
    setDoc("");
    setReason("");
    setDelivery("");

    setPriority("");
    if (editorRef.current) editorRef.current.textContent = "";
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/", { replace: true });
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
                  <Link to="/student/Settings">Parameters</Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className={styles.info}>
          <img
            src={user?.avatar ? `${process.env.REACT_APP_API_URL}${user.avatar}` : "/totalcertaficates.png"}
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

      <div className={styles.content}>
        <div className={styles.title}>
          <h1>Request Official Document</h1>
          <p>
            Submit a request to your university. Once approved, your document
            will be uploaded and secured in your digital wallet.
          </p>
        </div>

        {/* {success && (
          <p style={{ color: "green", marginBottom: "10px" }}>{success}</p>
        )}
        {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>} */}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.document}>
            <label>1. Document Type</label>
            <input
              type="text"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              required
            />
          </div>

          <div className={styles.reason}>
            <label>2. Reason for Request</label>
            <div
              ref={editorRef}
              contentEditable="true"
              className={styles.editor}
              onInput={(e) => setReason(e.currentTarget.textContent)}
            ></div>
          </div>

          {
            <div className={styles.option}>
              <h4>3. Delivery Option</h4>
              <div>
                <div className={styles.option1}>
                  <input
                    type="radio"
                    name="delivery"
                    value="digital"
                    checked={delivery === "digital"}
                    onChange={(e) => setDelivery(e.target.value)}
                  />
                  <div>
                    <h4>Digital copy only</h4>
                    <p>Fast & Free (Blockchain secured)</p>
                  </div>
                </div>

                <div className={styles.option1}>
                  <input
                    type="radio"
                    name="delivery"
                    value="physical"
                    checked={delivery === "physical"}
                    onChange={(e) => setDelivery(e.target.value)}
                  />
                  <div>
                    <h4>Official physical copy</h4>
                    <p>Includes stamp & signature</p>
                  </div>
                </div>
              </div>
            </div>
          }

          <div className={styles.priority}>
            <label>4. Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              required
            >
              <option value="" disabled>
                Choose
              </option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          <div className={styles.buttons}>
            <input type="submit" value="Submit Request" />
            <button type="button" onClick={clear}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className={styles.bottom}>
        <h4>Secured by TrustMyDegree Protocol •</h4>
      </div>
    </div>
  );
}

export default RequestStudent;

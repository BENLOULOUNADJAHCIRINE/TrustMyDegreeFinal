import styles from "./issue.module.css";
import { useState, useEffect } from "react";
import api from "../../../api";
import { toast } from "react-hot-toast";

function Issue() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("list"); // "list" | "one"

  // shared fields
  const [templateType, setTemplateType] = useState("diploma");
  const [date, setDate] = useState("");
  const [branch, setBranch] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [level, setLevel] = useState("");

  // list-mode fields
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);

  // one-mode fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  // internship extras
  const [company, setCompany] = useState("");
  const [internshipCity, setInternshipCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // rank extras
  const [rank, setRank] = useState("");
  const [average, setAverage] = useState("");
  const [credits, setCredits] = useState("");
  const [session, setSession] = useState("NORMAL");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const parsed = storedUser ? JSON.parse(storedUser) : {};
    setUser({
      name: parsed.role === "ADMIN" ? "Admin" : "Super Admin",
      email: parsed.email || "",
      avatar: parsed.avatar || null,
    });
  }, []);

  function handleReset() {
    setDate(""); setFile(null); setFileKey((k) => k + 1);
    setBranch(""); setSpeciality(""); setLevel("");
    setFirstName(""); setLastName(""); setStudentId(""); setEmail("");
    setCompany(""); setInternshipCity(""); setStartDate(""); setEndDate("");
    setRank(""); setAverage(""); setCredits(""); setSession("NORMAL");
  }

  function handleTemplateChange(val) {
    setTemplateType(val);
    setBranch(""); setSpeciality(""); setLevel("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!date) { toast.error("Please select a date"); return; }

    if (mode === "list") {
      if (!file) { toast.error("Please upload an Excel file"); return; }
      const form = new FormData();
      const dateField = templateType === "diploma" ? "graduationDate" : "issueDate";
      form.append(dateField, date);
      form.append("excel", file);
      form.append("templateType", templateType);
      form.append("class", level);
      form.append("speciality", speciality);
      form.append("branch", branch);
      try {
        const res = await api.post("/admin/import", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(`${res.data.created} certificates issued successfully!`);
        handleReset();
      } catch (err) {
        toast.error(err.response?.data?.message || "Something went wrong");
      }

    } else {
      // "add one" mode
      if (!firstName || !lastName || !studentId) {
        toast.error("Please fill in first name, last name, and student ID");
        return;
      }
      if (templateType === "internship" && (!startDate || !endDate || !speciality)) {
        toast.error("Please fill in internship role, start date, and end date");
        return;
      }
      if (templateType === "rank" && (!rank || !average || !branch || !speciality || !level)) {
        toast.error("Please fill in all rank fields");
        return;
      }

      const payload = {
        firstName, lastName, studentId, email, templateType,
        branch, speciality, class: level,
        [templateType === "diploma" ? "graduationDate" : "issueDate"]: date,
        // internship extras
        company, internshipCity, startDate, endDate,
        // rank extras
        rank, average, credits, session,
      };

      try {
        await api.post("/admin/issue-one", payload);
        toast.success("Certificate issued successfully!");
        handleReset();
      } catch (err) {
        toast.error(err.response?.data?.message || "Something went wrong");
      }
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
          <img src={user?.avatar ? user.avatar : "/totalcertaficates.png"} alt="avatar" />
        </div>
      </div>

      <div className={styles.main}>

        {/* ── Mode Toggle ── */}
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={mode === "list" ? styles.modeActive : styles.modeInactive}
            onClick={() => setMode("list")}
          >
            Add a List
          </button>
          <button
            type="button"
            className={mode === "one" ? styles.modeActive : styles.modeInactive}
            onClick={() => setMode("one")}
          >
            Add One
          </button>
        </div>

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

            {/* ── Template Type ── */}
            <div className={styles.slach}>
              <img src="/slach.png" alt="slash" />
              <h2 className={styles.h2}>Choose Template</h2>
            </div>

            <div className={styles.date}>
              <label>Document Type</label>
              <div style={{ display: "flex", gap: "20px", marginTop: "10px", flexWrap: "wrap" }}>
                {["diploma", "scolarite", "internship", "rank"].map((t) => (
                  <label key={t} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="templateType"
                      value={t}
                      checked={templateType === t}
                      onChange={() => handleTemplateChange(t)}
                    />
                    {t === "diploma" ? "Diploma"
                      : t === "scolarite" ? "School Certificate"
                      : t === "internship" ? "Internship Certificate"
                      : "Rank Certificate"}
                  </label>
                ))}
              </div>
            </div>

            {/* ── Date ── */}
            <div className={styles.firstrow}>
              <div className={styles.slach}>
                <img src="/slach.png" alt="slash" />
                <h2 className={styles.h2}>Certificate Details</h2>
              </div>

              <div className={styles.date}>
                <label>{templateType === "diploma" ? "Graduation Date" : "Issue Date"}</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              {/* ── Rank branch/speciality/class (shared for both modes) ── */}
              {templateType === "rank" && (
                <div className={styles.extraFields}>
                  <div className={styles.date}>
                    <label>Branch</label>
                    <select value={branch} onChange={(e) => { setBranch(e.target.value); setSpeciality(""); setLevel(""); }} required>
                      <option value="">Choose</option>
                      <option value="ST">ST</option>
                      <option value="MI">MI</option>
                    </select>
                  </div>
                  <div className={styles.fillier}>
                    {branch === "MI" && (
                      <div className={styles.date}>
                        <label>Speciality</label>
                        <select value={speciality} onChange={(e) => { setSpeciality(e.target.value); setLevel(""); }} required>
                          <option value="">Choose</option>
                          <option value="CP">CP</option>
                          <option value="AI">AI</option>
                          <option value="system security">System Security</option>
                        </select>
                      </div>
                    )}
                    {branch === "ST" && (
                      <div className={styles.date}>
                        <label>Speciality</label>
                        <select value={speciality} onChange={(e) => { setSpeciality(e.target.value); setLevel(""); }} required>
                          <option value="">Choose</option>
                          <option value="CP">CP</option>
                          <option value="GLE">GLE</option>
                          <option value="OS">OS</option>
                        </select>
                      </div>
                    )}
                    {speciality && (
                      <div className={styles.date}>
                        <label>Class</label>
                        <select value={level} onChange={(e) => setLevel(e.target.value)} required>
                          <option value="" disabled>Choose</option>
                          {speciality === "CP"
                            ? <><option value="1st">1st year</option><option value="2nd">2nd year</option></>
                            : <><option value="1st">1st year</option><option value="2nd">2nd year</option><option value="3rd">3rd year</option></>
                          }
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── List mode: excel upload ── */}
              {mode === "list" && (
                <>
                  <div className={styles.slach}>
                    <img src="/slach.png" alt="slash" className={styles.img} />
                    <h2 className={styles.h2}>Export excel file</h2>
                  </div>
                </>
              )}
            </div>

            {/* ── LIST MODE: drag & drop ── */}
            {mode === "list" && (
              <div className={styles.sndrow}>
                <div
                  className={`${styles.upload} ${file ? styles.uploadReady : ""}`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile) {
                      const validTypes = [
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "application/vnd.ms-excel",
                      ];
                      if (!validTypes.includes(droppedFile.type) && !droppedFile.name.endsWith(".xlsx")) {
                        toast.error("Please drop a valid .xlsx Excel file");
                        return;
                      }
                      setFile(droppedFile);
                    }
                  }}
                >
                  <div className={styles.uploadIcon}>{file ? "✅" : ""}</div>
                  <label className={styles.lab}>
                    {file ? file.name : "Drag & drop .xlsx file here"}
                  </label>
                  {file
                    ? <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB · Click to replace</span>
                    : <span className={styles.fileSize}>or click to browse your files</span>
                  }
                  <input
                    className={styles.file}
                    type="file"
                    key={fileKey}
                    accept=".xlsx"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </div>
              </div>
            )}

            {/* ── ONE MODE: student fields ── */}
            {mode === "one" && (
              <div className={styles.oneFields}>
                <div className={styles.slach}>
                  <img src="/slach.png" alt="slash" />
                  <h2 className={styles.h2}>Student Information</h2>
                </div>

                <div className={styles.fillier}>
                  <div className={styles.date}>
                    <label>First Name</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Ahmed" required />
                  </div>
                  <div className={styles.date}>
                    <label>Last Name</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Benali" required />
                  </div>
                  <div className={styles.date}>
                    <label>Student ID (Matricule)</label>
                    <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. 2021001" required />
                  </div>
                  <div className={styles.date}>
                    <label>Email (optional)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. student@ensta.edu.dz" />
                  </div>
                </div>

                {/* internship extras */}
                {templateType === "internship" && (
                  <>
                    <div className={styles.slach}>
                      <img src="/slach.png" alt="slash" />
                      <h2 className={styles.h2}>Internship Details</h2>
                    </div>
                    <div className={styles.fillier}>
                      <div className={styles.date}>
                        <label>Internship Role</label>
                        <input type="text" value={speciality} onChange={(e) => setSpeciality(e.target.value)} placeholder="e.g. Software Engineer" required />
                      </div>
                      <div className={styles.date}>
                        <label>Company</label>
                        <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Sonatrach" />
                      </div>
                      <div className={styles.date}>
                        <label>City</label>
                        <input type="text" value={internshipCity} onChange={(e) => setInternshipCity(e.target.value)} placeholder="e.g. Algiers" />
                      </div>
                      <div className={styles.date}>
                        <label>Start Date</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                      </div>
                      <div className={styles.date}>
                        <label>End Date</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                      </div>
                    </div>
                  </>
                )}

                {/* rank extras */}
                {templateType === "rank" && (
                  <>
                    <div className={styles.slach}>
                      <img src="/slach.png" alt="slash" />
                      <h2 className={styles.h2}>Rank Details</h2>
                    </div>
                    <div className={styles.fillier}>
                      <div className={styles.date}>
                        <label>Rank</label>
                        <input type="number" value={rank} onChange={(e) => setRank(e.target.value)} placeholder="e.g. 3" required />
                      </div>
                      <div className={styles.date}>
                        <label>Average</label>
                        <input type="text" value={average} onChange={(e) => setAverage(e.target.value)} placeholder="e.g. 14.5" required />
                      </div>
                      <div className={styles.date}>
                        <label>Credits</label>
                        <input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="e.g. 30" />
                      </div>
                      <div className={styles.date}>
                        <label>Session</label>
                        <select value={session} onChange={(e) => setSession(e.target.value)}>
                          <option value="NORMAL">Normal</option>
                          <option value="RATTRAPAGE">Rattrapage</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className={styles.buts}>
              <button className={styles.cancle} type="button" onClick={handleReset}>
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
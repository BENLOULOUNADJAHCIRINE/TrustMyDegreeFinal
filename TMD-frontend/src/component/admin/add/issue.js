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

  // one-mode: student info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");

  // diploma/scolarite extras — all required in "add one"
  const [mention, setMention] = useState("");
  const [faculty, setFaculty] = useState("");
  const [sectionNum, setSectionNum] = useState("");
  const [facultyNum, setFacultyNum] = useState("");
  const [year, setYear] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  // internship extras — all required in "add one"
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
    setMention(""); setFaculty(""); setSectionNum(""); setFacultyNum("");
    setYear(""); setAcademicYear("");
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
        console.log("API response:", res.data); 
        toast.success(`${res.data.created} certificates issued successfully!`);
        handleReset();
      } catch (err) {
        console.log("API error:", err.response?.data);
        toast.error(err.response?.data?.message || "Something went wrong");
      }

    } else {
      // "add one" mode — validate all required fields

      // ── Student Info ──────────────────────────────────────────
      if (!firstName)  { toast.error("First name is required");  return; }
      if (!lastName)   { toast.error("Last name is required");   return; }
      if (!studentId)  { toast.error("Student ID is required");  return; }
      // email is intentionally optional

      // ── Diploma ───────────────────────────────────────────────
      if (templateType === "diploma") {
        if (!speciality)  { toast.error("Speciality is required");    return; }
        if (!mention)     { toast.error("Mention is required");       return; }
        if (!faculty)     { toast.error("Faculty is required");       return; }
        if (!sectionNum)  { toast.error("Section N° is required");    return; }
        if (!facultyNum)  { toast.error("Faculty N° is required");    return; }
        if (!year)        { toast.error("Year is required");          return; }
      }

      // ── School Certificate ────────────────────────────────────
      if (templateType === "scolarite") {
        if (!speciality)    { toast.error("Speciality is required");       return; }
        if (!mention)       { toast.error("Mention is required");          return; }
        if (!faculty)       { toast.error("Faculty is required");          return; }
        if (!sectionNum)    { toast.error("Section N° is required");       return; }
        if (!facultyNum)    { toast.error("Faculty N° is required");       return; }
        if (!year)          { toast.error("Year is required");             return; }
        if (!academicYear)  { toast.error("Academic Year is required");    return; }
      }

      // ── Internship ────────────────────────────────────────────
      if (templateType === "internship") {
        if (!speciality)      { toast.error("Internship role is required"); return; }
        if (!company)         { toast.error("Company is required");         return; }
        if (!internshipCity)  { toast.error("City is required");            return; }
        if (!startDate)       { toast.error("Start date is required");      return; }
        if (!endDate)         { toast.error("End date is required");        return; }
      }

      // ── Rank ──────────────────────────────────────────────────
      if (templateType === "rank") {
        if (!branch)     { toast.error("Branch is required");     return; }
        if (!speciality) { toast.error("Speciality is required"); return; }
        if (!level)      { toast.error("Class is required");      return; }
        if (!rank)       { toast.error("Rank is required");       return; }
        if (!average)    { toast.error("Average is required");    return; }
        if (!credits)    { toast.error("Credits are required");   return; }
        if (isNaN(rank) || rank <= 0)
          { toast.error("Rank must be a positive number"); return; }
        if (isNaN(average) || average < 0 || average > 20)
          { toast.error("Average must be between 0 and 20"); return; }
        if (isNaN(credits) || credits <= 0)
          { toast.error("Credits must be a positive number"); return; }
      }

      const payload = {
        firstName, lastName, studentId, email, templateType,
        branch, speciality, class: level,
        [templateType === "diploma" ? "graduationDate" : "issueDate"]: date,
        mention, faculty, sectionNum, facultyNum, year, academicYear,
        company, internshipCity, startDate, endDate,
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
        <div className={styles.mainWrapper}>

          {/* Mode Toggle */}
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
              <img className={styles.f} src="/Vector.png" alt="vect" />
            </div>

            <form className={styles.send} onSubmit={handleSubmit}>

              {/* Template Type */}
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

              {/* Certificate Details */}
              <div className={styles.firstrow}>
                <div className={styles.slach}>
                  <img src="/slach.png" alt="slash" />
                  <h2 className={styles.h2}>Certificate Details</h2>
                </div>

                <div className={styles.date}>
                  <label>{templateType === "diploma" ? "Graduation Date" : "Issue Date"}</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                {/* Rank selectors for LIST mode only */}
                {templateType === "rank" && mode === "list" && (
                  <div className={styles.extraFields}>
                    <div className={styles.date}>
                      <label>Branch</label>
                      <select value={branch} onChange={(e) => { setBranch(e.target.value); setSpeciality(""); setLevel(""); }}>
                        <option value="">Choose</option>
                        <option value="ST">ST</option>
                        <option value="MI">MI</option>
                      </select>
                    </div>
                    <div className={styles.fillier}>
                      {branch === "MI" && (
                        <div className={styles.date}>
                          <label>Speciality</label>
                          <select value={speciality} onChange={(e) => { setSpeciality(e.target.value); setLevel(""); }}>
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
                          <select value={speciality} onChange={(e) => { setSpeciality(e.target.value); setLevel(""); }}>
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
                          <select value={level} onChange={(e) => setLevel(e.target.value)}>
                            <option value="" disabled>Choose</option>
                            {speciality === "CP" ? (
                              <><option value="1st">1st year</option><option value="2nd">2nd year</option></>
                            ) : (
                              <><option value="1st">1st year</option><option value="2nd">2nd year</option><option value="3rd">3rd year</option></>
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {mode === "list" && (
                  <div className={styles.slach}>
                    <img src="/slach.png" alt="slash" className={styles.img} />
                    <h2 className={styles.h2}>Export excel file</h2>
                  </div>
                )}
              </div>

              {/* LIST MODE: drag & drop */}
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
                          toast.error("Please drop a valid .xlsx Excel file"); return;
                        }
                        setFile(droppedFile);
                      }
                    }}
                  >
                    <div className={styles.uploadIcon}>{file ? "✅" : ""}</div>
                    <label className={styles.lab}>{file ? file.name : "Drag & drop .xlsx file here"}</label>
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

              {/* ONE MODE: all fields */}
              {mode === "one" && (
                <div className={styles.oneFields}>

                  {/* Student Info */}
                  <div className={styles.slach}>
                    <img src="/slach.png" alt="slash" />
                    <h2 className={styles.h2}>Student Information</h2>
                  </div>
                  <div className={styles.fillier}>
                    <div className={styles.date}>
                      <label>First Name *</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Ahmed" />
                    </div>
                    <div className={styles.date}>
                      <label>Last Name *</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Benali" />
                    </div>
                    <div className={styles.date}>
                      <label>Student ID (Matricule) *</label>
                      <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. 2021001" />
                    </div>
                    <div className={styles.date}>
                      <label>Email (optional)</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. student@ensta.edu.dz" />
                    </div>
                  </div>

                  {/* DIPLOMA */}
                  {templateType === "diploma" && (
                    <>
                      <div className={styles.slach}>
                        <img src="/slach.png" alt="slash" />
                        <h2 className={styles.h2}>Academic Details</h2>
                      </div>
                      <div className={styles.fillier}>
                        <div className={styles.date}>
                          <label>Speciality *</label>
                          <input type="text" value={speciality} onChange={(e) => setSpeciality(e.target.value)} placeholder="e.g. Informatique" />
                        </div>
                        <div className={styles.date}>
                          <label>Mention *</label>
                          <input type="text" value={mention} onChange={(e) => setMention(e.target.value)} placeholder="e.g. Très Bien" />
                        </div>
                        <div className={styles.date}>
                          <label>Faculty *</label>
                          <input type="text" value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="e.g. Science" />
                        </div>
                        <div className={styles.date}>
                          <label>Section N° *</label>
                          <input type="text" value={sectionNum} onChange={(e) => setSectionNum(e.target.value)} placeholder="e.g. 01" />
                        </div>
                        <div className={styles.date}>
                          <label>Faculty N° *</label>
                          <input type="text" value={facultyNum} onChange={(e) => setFacultyNum(e.target.value)} placeholder="e.g. 02" />
                        </div>
                        <div className={styles.date}>
                          <label>Year *</label>
                          <input type="text" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* SCHOOL CERTIFICATE */}
                  {templateType === "scolarite" && (
                    <>
                      <div className={styles.slach}>
                        <img src="/slach.png" alt="slash" />
                        <h2 className={styles.h2}>Academic Details</h2>
                      </div>
                      <div className={styles.fillier}>
                        <div className={styles.date}>
                          <label>Speciality *</label>
                          <input type="text" value={speciality} onChange={(e) => setSpeciality(e.target.value)} placeholder="e.g. Informatique" />
                        </div>
                        <div className={styles.date}>
                          <label>Mention *</label>
                          <input type="text" value={mention} onChange={(e) => setMention(e.target.value)} placeholder="e.g. Très Bien" />
                        </div>
                        <div className={styles.date}>
                          <label>Faculty *</label>
                          <input type="text" value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="e.g. Science" />
                        </div>
                        <div className={styles.date}>
                          <label>Section N° *</label>
                          <input type="text" value={sectionNum} onChange={(e) => setSectionNum(e.target.value)} placeholder="e.g. 01" />
                        </div>
                        <div className={styles.date}>
                          <label>Faculty N° *</label>
                          <input type="text" value={facultyNum} onChange={(e) => setFacultyNum(e.target.value)} placeholder="e.g. 02" />
                        </div>
                        <div className={styles.date}>
                          <label>Year *</label>
                          <input type="text" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024" />
                        </div>
                        <div className={styles.date}>
                          <label>Academic Year *</label>
                          <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2023/2024" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* INTERNSHIP */}
                  {templateType === "internship" && (
                    <>
                      <div className={styles.slach}>
                        <img src="/slach.png" alt="slash" />
                        <h2 className={styles.h2}>Internship Details</h2>
                      </div>
                      <div className={styles.fillier}>
                        <div className={styles.date}>
                          <label>Internship Role *</label>
                          <input type="text" value={speciality} onChange={(e) => setSpeciality(e.target.value)} placeholder="e.g. Software Engineer" />
                        </div>
                        <div className={styles.date}>
                          <label>Company *</label>
                          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Sonatrach" />
                        </div>
                        <div className={styles.date}>
                          <label>City *</label>
                          <input type="text" value={internshipCity} onChange={(e) => setInternshipCity(e.target.value)} placeholder="e.g. Algiers" />
                        </div>
                        <div className={styles.date}>
                          <label>Start Date *</label>
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className={styles.date}>
                          <label>End Date *</label>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* RANK */}
                  {templateType === "rank" && (
                    <>
                      <div className={styles.slach}>
                        <img src="/slach.png" alt="slash" />
                        <h2 className={styles.h2}>Academic Details</h2>
                      </div>
                      <div className={styles.fillier}>
                        <div className={styles.date}>
                          <label>Branch *</label>
                          <select value={branch} onChange={(e) => { setBranch(e.target.value); setSpeciality(""); setLevel(""); }}>
                            <option value="">Choose</option>
                            <option value="ST">ST</option>
                            <option value="MI">MI</option>
                          </select>
                        </div>
                        {branch === "MI" && (
                          <div className={styles.date}>
                            <label>Speciality *</label>
                            <select value={speciality} onChange={(e) => { setSpeciality(e.target.value); setLevel(""); }}>
                              <option value="">Choose</option>
                              <option value="CP">CP</option>
                              <option value="AI">AI</option>
                              <option value="system security">System Security</option>
                            </select>
                          </div>
                        )}
                        {branch === "ST" && (
                          <div className={styles.date}>
                            <label>Speciality *</label>
                            <select value={speciality} onChange={(e) => { setSpeciality(e.target.value); setLevel(""); }}>
                              <option value="">Choose</option>
                              <option value="CP">CP</option>
                              <option value="GLE">GLE</option>
                              <option value="OS">OS</option>
                            </select>
                          </div>
                        )}
                        {speciality && (
                          <div className={styles.date}>
                            <label>Class *</label>
                            <select value={level} onChange={(e) => setLevel(e.target.value)}>
                              <option value="" disabled>Choose</option>
                              {speciality === "CP" ? (
                                <><option value="1st">1st year</option><option value="2nd">2nd year</option></>
                              ) : (
                                <><option value="1st">1st year</option><option value="2nd">2nd year</option><option value="3rd">3rd year</option></>
                              )}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className={styles.slach}>
                        <img src="/slach.png" alt="slash" />
                        <h2 className={styles.h2}>Rank Details</h2>
                      </div>
                      <div className={styles.fillier}>
                        <div className={styles.date}>
                          <label>Rank *</label>
                          <input type="number" value={rank} onChange={(e) => setRank(e.target.value)} placeholder="e.g. 3" />
                        </div>
                        <div className={styles.date}>
                          <label>Average *</label>
                          <input type="text" value={average} onChange={(e) => setAverage(e.target.value)} placeholder="e.g. 14.5" />
                        </div>
                        <div className={styles.date}>
                          <label>Credits *</label>
                          <input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="e.g. 30" />
                        </div>
                        <div className={styles.date}>
                          <label>Session *</label>
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
                <button className={styles.cancle} type="button" onClick={handleReset}>Cancel</button>
                <input className={styles.issue} type="submit" value="ISSUE CERTIFICATE" />
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Issue;
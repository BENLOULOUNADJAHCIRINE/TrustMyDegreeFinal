import styles from "./Verify.module.css";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
function Verify() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    if (urlCode) {
      setCode(urlCode);
      verifyCode(urlCode);
    }
  }, []);

  function verifyCode(codeToVerify) {
    fetch(`${process.env.REACT_APP_API_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeToVerify }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.valid === true) {
          setResult(data.certificate);
          setStatus("found");
        } else if (data.message === "Certificate has been revoked") {
          setResult(null);
          setStatus("revoked");
        } else {
          setResult(null);
          setStatus("not_found");
        }
      })
      .catch((err) => toast.error("failed to fetch"));
  }

  function handleVerify(e) {
    e.preventDefault();
    verifyCode(code);
  }

  return (
    <div className={styles["main-content"]}>
      <h1>
        Verify Your Diploma <span> Instantly </span>
      </h1>
      <p>
        Enter a diploma ID, QR code, or graduate email to check authenticity
        against our global blockchain ledger.
      </p>

      <form className={styles.verify} onSubmit={handleVerify}>
        <div className={styles.info}>
          <h6>ID du Certificat</h6>
          <div className={styles.inputBox}>
            <img src="/inputee.png" alt="inputee" />
            <input
              type="text"
              placeholder="#1847"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        </div>
        <input
          type="submit"
          value="Verify Certificate ➜"
          className={styles.submit}
          onClick={() => setOpen(true)}
        />
      </form>

      {open && (
        <div className={styles.out}>
          {/* SUCCESS */}
          {status === "found" && result && (
            <div className={styles.successBox}>
              <button className={styles.close} onClick={() => setOpen(false)}>
                {" "}
                &times;{" "}
              </button>
              <div className={styles.header}>
                {" "}
                <h3>✅ Certificate Valid</h3>
              </div>

              <div className={styles.contentScroll}>
                <div className={styles.topinfo}>
                  <div className={styles.item}>
                    {" "}
                    <p>
                      {" "}
                      <strong>Name:</strong> {result.student.fullName}{" "}
                    </p>{" "}
                  </div>
                  <div className={styles.item}>
                    {" "}
                    <p>
                      {" "}
                      <strong>Matricule:</strong>{" "}
                      {result.student.matricule}{" "}
                    </p>{" "}
                  </div>
                  <div className={styles.item}>
                    {" "}
                    <p>
                      <strong>Date of Birth:</strong>{" "}
                      {result.student.dateOfBirth}{" "}
                    </p>{" "}
                  </div>
                  <div className={styles.item}>
                    {" "}
                    <p>
                      {" "}
                      <strong>Place of Birth:</strong>{" "}
                      {result.student.placeOfBirth}{" "}
                    </p>{" "}
                  </div>
                  <div className={styles.item}>
                    {" "}
                    <p>
                      {" "}
                      <strong>Certificate Type:</strong> {result.contractType}
                    </p>
                  </div>

                  <div className={styles.item}>
                    {" "}
                    <p>
                      {" "}
                      <strong>Specialty:</strong>{" "}
                      {result.contractType === "RANK"
                        ? result.academicData?.speciality
                        : result.contractType === "DIPLOMA"
                          ? result.academicData?.fieldOfStudy
                          : result.contractType === "INTERNSHIP"
                            ? result.academicData?.internshipRole
                            : result.contractType === "STUDY"
                              ? result.academicData?.programName
                              : "—"}{" "}
                    </p>{" "}
                  </div>
                </div>
                <div className={styles.item}>
                  {" "}
                  <p>
                    {" "}
                    <strong>Issue Date:</strong>{" "}
                    {new Date(result.issueDate).toLocaleDateString(
                      "fr-FR",
                    )}{" "}
                  </p>{" "}
                </div>

                {result.contractType === "INTERNSHIP" &&
                  result.academicData && (
                    <>
                      <div className={styles.item}>
                        {" "}
                        <p>
                          {" "}
                          <strong>Company:</strong>{" "}
                          {result.academicData.companyName}{" "}
                        </p>
                      </div>
                      <div className={styles.item}>
                        <p>
                          {" "}
                          <strong>City:</strong>{" "}
                          {result.academicData.internshipCity}{" "}
                        </p>
                      </div>
                      <div className={styles.item}>
                        {" "}
                        <p>
                          {" "}
                          <strong>Start Date:</strong>{" "}
                          {new Date(
                            Number(result.academicData.startDate) * 1000,
                          ).toLocaleDateString("fr-FR")}{" "}
                        </p>
                      </div>
                      <div className={styles.item}>
                        {" "}
                        <p>
                          {" "}
                          <strong>End Date:</strong>{" "}
                          {new Date(
                            Number(result.academicData.endDate) * 1000,
                          ).toLocaleDateString("fr-FR")}{" "}
                        </p>
                      </div>
                    </>
                  )}
                {result.contractType === "RANK" && result.academicData && (
                  <>
                    <div className={styles.item}>
                      {" "}
                      <p>
                        {" "}
                        <strong>Rank:</strong> {result.academicData.rank}{" "}
                      </p>
                    </div>
                    <div className={styles.item}>
                      {" "}
                      <p>
                        {" "}
                        <strong>Average:</strong> {result.academicData.average}
                      </p>
                    </div>
                    <div className={styles.item}>
                      {" "}
                      <p>
                        <strong>Speciality:</strong>{" "}
                        {result.academicData.speciality}{" "}
                      </p>
                    </div>
                    <div className={styles.item}>
                      {" "}
                      <p>
                        {" "}
                        <strong>Year:</strong> {result.academicData.year}{" "}
                      </p>{" "}
                    </div>
                    <div className={styles.item}>
                      {" "}
                      <p>
                        {" "}
                        <strong>Branch:</strong>{" "}
                        {result.academicData.branch}{" "}
                      </p>
                    </div>
                    <div className={styles.item}>
                      {" "}
                      <p>
                        {" "}
                        <strong>Session:</strong>{" "}
                        {result.academicData.session}{" "}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* REVOKED */}
          {status === "revoked" && (
            <div className={styles.errorBox}>
              <button className={styles.close} onClick={() => setOpen(false)}>
                &times;
              </button>
              <h3>Certificate Revoked </h3>
              <p>This certificate has been invalidated by the institution.</p>
            </div>
          )}

          {/* NOT FOUND */}
          {status === "not_found" && (
            <div className={styles.errorBox}>
              <button className={styles.close} onClick={() => setOpen(false)}>
                &times;
              </button>
              <h3>Certificate Not Found </h3>
              <p>No certificate matches this code.</p>
            </div>
          )}
        </div>
      )}

      <div className={styles.bottomStatus}>
        <div className={styles.online}>
          <img src="dot.png" alt="dots" />
          <h6>Network Online</h6>
        </div>

        <div className={styles.secure}>
          <img src="/secure.png" alt="secure" />
          <h6>256-bit SSL Secure </h6>
        </div>
      </div>
    </div>
  );
}

export default Verify;

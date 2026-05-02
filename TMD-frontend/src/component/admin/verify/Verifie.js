import styles from "./Verifie.module.css";
import { useState, useEffect } from "react";

function Verifie() {
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
      .catch((err) => window.alert(err));
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
          {status === "found" && result && (
            <div className={styles.successBox}>
              <button className={styles.close} onClick={() => setOpen(false)}>
                &times;
              </button>

              <div className={styles.header}>
                <img
                  src="/check.png"
                  alt="check"
                  style={{ width: "24px", height: "24px" }}
                />
                <h2>VALIDE CERTIFICATE</h2>
              </div>

              <div className={styles.contentScroll}>
                <div className={styles.item}>
                  <span>Nom</span>
                  {result.student.fullName}
                </div>

                <div className={styles.item}>
                  <span>Matricule</span>
                  {result.student.matricule}
                </div>

                <div className={styles.item}>
                  <span>Type de certificat</span>
                  {result.contractType}
                </div>

                <div className={styles.item}>
                  <span>Date d'émission</span>
                  {new Date(result.issueDate).toLocaleDateString("fr-FR")}
                </div>

                {result.contractType === "RANK" && result.academicData && (
                  <>
                    <div className={styles.item}>
                      <span>Spécialité</span>
                      {result.academicData.speciality}
                    </div>
                    <div className={styles.item}>
                      <span>Classement</span>
                      {result.academicData.rank}
                    </div>
                    <div className={styles.item}>
                      <span>Moyenne</span>
                      {result.academicData.average}
                    </div>
                    <div className={styles.item}>
                      <span>Année</span>
                      {result.academicData.year}
                    </div>
                    <div className={styles.item}>
                      <span>Branche</span>
                      {result.academicData.branch}
                    </div>
                    <div className={styles.item}>
                      <span>Session</span>
                      {result.academicData.session}
                    </div>
                  </>
                )}

                {result.contractType === "DIPLOMA" && result.academicData && (
                  <>
                    <div className={styles.item}>
                      <span>Filière</span>
                      {result.academicData.fieldOfStudy}
                    </div>
                  </>
                )}

                {result.contractType === "INTERNSHIP" &&
                  result.academicData && (
                    <>
                      <div className={styles.item}>
                        <span>Rôle</span>
                        {result.academicData.internshipRole}
                      </div>
                      <div className={styles.item}>
                        <span>Entreprise</span>
                        {result.academicData.companyName}
                      </div>
                      <div className={styles.item}>
                        <span>Ville</span>
                        {result.academicData.internshipCity}
                      </div>
                      <div className={styles.item}>
                        <span>Date de début</span>
                        {new Date(
                          Number(result.academicData.startDate) * 1000,
                        ).toLocaleDateString("fr-FR")}
                      </div>
                      <div className={styles.item}>
                        <span>Date de fin</span>
                        {new Date(
                          Number(result.academicData.endDate) * 1000,
                        ).toLocaleDateString("fr-FR")}
                      </div>
                    </>
                  )}

                {result.contractType === "STUDY" && result.academicData && (
                  <>
                    <div className={styles.item}>
                      <span>Programme</span>
                      {result.academicData.programName}
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
          <img src="/dot.png" alt="dots" />
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

export default Verifie;

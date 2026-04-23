import { useState, useEffect, useRef } from "react";
import styles from "./Home.module.css";
import { useNavigate, useLocation } from "react-router-dom";

function Home() {
  const navigate = useNavigate();
  const editorRef = useRef(null);

  function ToVerify() {
    navigate("/verify");
  }

  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  // the refresh keep the same place , not depending on the location
  useEffect(() => {
    const sections = ["home", "about", "ver", "faq", "contact"];

    const handleScroll = () => {
      let current = "home";

      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();

          if (rect.top <= 100 && rect.bottom >= 100) {
            current = id;
          }
        }
      });

      // update URL without reloading
      window.history.replaceState(null, "", `/#${current}`);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [name, setName] = useState("");

  const [institution, setInstitution] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [message, setMessage] = useState("");

  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();

    fetch("http://localhost:5000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        institution,
        email,
        phone,
        message,
        agreedToPolicy,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);

        //  clear form
        setName("");
        setInstitution("");
        setEmail("");
        setPhone("");
        setMessage("");
        setAgreedToPolicy(false);
        setSuccess(true);

        // clear contenteditable manually
        if (editorRef.current) {
          editorRef.current.textContent = "";
        }

        // hide success message after 4 seconds
        setTimeout(() => setSuccess(false), 4000);
      })
      .catch((err) => console.log(err));
  }

  return (
    <>
      <section className={styles.page1} id="home">
        <div className={styles.introd}>
          <h3> Blockchain Secured Network</h3>
          <h1>
            Validate <span className={styles.H2}>Certificates</span>{" "}
            <span className={styles.H3}>Instantly </span>Secured{" "}
          </h1>
          <p>
            Using blockchain technology to eliminate fraud and simplify
            credential verification
          </p>
          <button onClick={ToVerify}>Get Started</button>
        </div>

        <img src="/home.png" alt="home " />
      </section>

      <section className={styles.page2} id="about">
        <div className={styles.left}>
          <h3> WHY TRUSTMYDEGREE</h3>
          <h1>
            A Platform Built for{" "}
            <span className={styles.H4}>Absolute Truth</span>{" "}
          </h1>
          <div className={styles.container}>
            <h3> INFRASTRUCTURE</h3>
            <h1>Immutable Core Technology </h1>
            <p>
              Our infrastructure eliminates the middleman, providing a direct
              link between the issuer and the validator.
            </p>
            <p>
              We leverage decentralized architecture to ensure every certificate
              is permanently anchored to the blockchain.
            </p>
            <img src="/heart.png" alt="i" />
          </div>
        </div>

        <div className={styles.right}>
          <h1>Academic-Grade Certificate Verification</h1>
          <div className={styles.c}>
            <img src="/firstright.png" alt="fi" />
            <div>
              <h3>Instant Fraud Prevention</h3>
              <p>
                Eliminate fake certificates with real-time blockchain
                verification.
              </p>
            </div>
          </div>
          <div className={styles.c}>
            <img src="/secondright.png" alt="s" />
            <div>
              <h3>Global Access</h3>
              <p>Verify from anywhere in the world, 24/7.</p>
            </div>
          </div>
          <div className={styles.c}>
            <img src="/thirdright.png" alt="t" />
            <div>
              <h3>Cost Efficiency</h3>
              <p>Reduce administrative overhead by up to 80%.</p>
            </div>
          </div>
          <div className={styles.c}>
            <img src="/forthrigth.png" alt="fo" />
            <div>
              <h3>API Integration</h3>
              <p>
                Seamlessly connect the platform with the blockchain and backend
                services.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.page3} id="ver">
        <h1>Verification methods</h1>

        <div className={styles.methods}>
          <div className={styles.method}>
            <img className={styles.m} src="/m1.png" alt="m1" />
            <h3>Manual Search</h3>
            <p>Find certificates by registration number or name.</p>
          </div>

          <div className={styles.method}>
            <img src="/m2.png" alt="m2" />
            <h3>QR Scanner</h3>
            <p>Quick scan mobile verification for physical copies.</p>
          </div>

          <div className={styles.method}>
            <img src="/m3.png" alt="m3" />
            <h3>Blockchain Info</h3>
            <p>Access the immutable record of issuance data.</p>
          </div>
        </div>
      </section>

      <section className={styles.page4} id="faq">
        <h1>Frequently Asked Questions</h1>

        <div className={styles.deflist}>
          <details>
            <summary>
              How does blockchain verification prevent fraud?
              <span className={styles.icon}>▼</span>
            </summary>
            <p>
              Every certificate is stored as a unique, tamper-proof record on
              the blockchain. Once issued, it cannot be altered or faked —
              anyone can verify its authenticity instantly without contacting
              the institution.
            </p>
          </details>

          <details>
            <summary>
              How long does it take to verify a certificate?
              <span className={styles.icon}>▼</span>
            </summary>
            <p>
              Verification is instant. Simply enter the certificate ID or scan
              the QR code, and the result appears in seconds — no waiting, no
              back-and-forth with institutions.
            </p>
          </details>

          <details>
            <summary>
              Do I need an account to verify a credential?
              <span className={styles.icon}>▼</span>
            </summary>
            <p>
              No account is needed to verify a certificate. Anyone — employers,
              institutions, or individuals — can verify credentials directly
              from our platform without registering.
            </p>
          </details>

          <details>
            <summary>
              Is student data stored securely and privately?
              <span className={styles.icon}>▼</span>
            </summary>
            <p>
              Yes. Student data is encrypted and stored on a decentralized
              blockchain network, meaning no single party controls it. Only
              authorized institutions and the student themselves can access
              personal records — your data is never sold or shared with third
              parties.
            </p>
          </details>
        </div>
      </section>

      <section className={styles.page5} id="contact">
        <div className={styles.main}>
          <div className={styles.design}>
            <div className={styles.message}>
              <img src="/mess.png" alt="message" />
              <h1>Contact us</h1>
            </div>

            <div className={styles.em}>
              <img src="/mess.png" alt="message" />
              <p>administartion@ensta.edu.dz</p>
            </div>
          </div>

          <div className={styles.info}>
            <form className={styles.Frm} onSubmit={handleSubmit}>
              <div className={styles.R1}>
                <div className={styles.match}>
                  <h4>YOUR NAME</h4>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.match}>
                  <h4>INSTITION</h4>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.R1}>
                <div className={styles.match}>
                  <h4>EMAIL</h4>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.match}>
                  <h4>CELL PHONE </h4>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.R2}>
                <h4>REQUIREMENT DETAILS</h4>
                <div
                  ref={editorRef}
                  contentEditable="true"
                  className={styles.editor}
                  onInput={(e) => setMessage(e.currentTarget.textContent)}
                ></div>
              </div>

              <div className={styles.R3}>
                <input
                  type="checkbox"
                  checked={agreedToPolicy}
                  onChange={(e) => setAgreedToPolicy(e.target.checked)}
                  required
                />
                <h6>
                  I agree that my data may be processed by the IPCG in
                  accordance with the Privacy Policy to manage my request for
                  information.
                </h6>
              </div>

              {success && (
                <div style={{
                  marginTop: "16px",
                  padding: "12px 20px",
                  backgroundColor: "#dcfce7",
                  border: "1px solid #86efac",
                  borderRadius: "12px",
                  color: "#166534",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  animation: "fadeUp 0.4s ease both",
                }}>
                   Your message has been sent successfully! We'll get back to you soon.
                </div>
              )}

              <input type="submit" value="SEND INFORMATION REQUEST" />
            </form>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.align}>
          <div className={styles.ensta}>
            <h3>ENSTA</h3>
            <p>
              The world's most advanced blockchain infrastructure for
              institutional credential verification.
            </p>
          </div>

          <div className={styles.platform}>
            <h3> Platform</h3>
            <p>Institutional Portal</p>
            <div>
              <img src="/fac.png" alt="facebook" />
              <a
                href="https://www.facebook.com/ENSTA.Alger/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
            </div>

            <div>
              <img src="/linkedin.png" alt="linkedin" />
              <a
                href="https://www.linkedin.com/school/ensta-alger/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Linkedin
              </a>
            </div>

            <div>
              <img src="/youtube.png" alt="youtube" />
              <a
                href="https://www.youtube.com/@ENSTAAlger"
                target="_blank"
                rel="noopener noreferrer"
              >
                Youtube
              </a>
            </div>
          </div>

          <div className={styles.solution}>
            <h3>Solutions</h3>
            <p>Universities</p>
            <p>Corporations</p>
            <p>Governments</p>
            <p>Recruitment Agencies</p>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>© 2026 ENSTA GLOBAL TECHNOLOGIES. ALL RIGHTS RESERVED.</p>
          <div>
            <img src="/dot.png" alt="dot" />
            <p>Network Status: Operational</p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Home;
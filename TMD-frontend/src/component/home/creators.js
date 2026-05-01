import styles from "./Creators.module.css";
import { useEffect } from "react";

function Creators() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className={styles["main-content"]}>
      <div className={styles.section1}>
        <h3>Meet the team</h3>
        <h1>
          Built by students,
          <br /> secured by <span>blockchain</span>
        </h1>
        <p>
          We are 5 engineering students from ENSTA who built TrustMyDegree a
          platform to eliminate diploma fraud using decentralized blockchain
          technology.
        </p>
      </div>

      <nav className={styles.tools}>
        <h3>Tech stack</h3>
        <div>
          <h4 className={styles.blue}>React.js</h4>
          <h4 className={styles.blue}>css</h4>
          <h4 className={styles.green}>Node.js</h4>
          <h4 className={styles.green}>Blockchain</h4>
          <h4 className={styles.purple}>Etheruim.js</h4>
          <h4 className={styles.purple}>Solidity.js</h4>
          <h4 className={styles.orange}>expeess.js</h4>
          <h4 className={styles.orange}>PostgreSQL.js</h4>
        </div>
      </nav>

      <div className={styles.section2}>
        <div className={styles.title}>
          <h3>The people behind it</h3>
          <p>5 developers · ENSTA Algeria · 2026</p>
        </div>

        <div className={styles.members}>
          <div className={styles.member}>
            <div className={`${styles.avatar} ${styles["av-amber"]}`}>B</div>
            <h4 className={styles.name}>Arar Bouchra Manel</h4>
            <h4 className={styles.role}>Frontend Lead</h4>
            <p className={styles.year}> 2nd Year · MI</p>
            <p className={styles.desc}>
              {" "}
              Fully owned the frontend, enforcing structure, performance, and a
              clean, uncompromising user experience.
            </p>
            <div className={styles.links}>
              <a
                href="https://github.com/wolfey-cmyk"
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                GitHub
              </a>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className={styles.member}>
            <div className={`${styles.avatar} ${styles["av-purple"]}`}>N</div>
            <h4 className={styles.name}>Benloulou Nadjah Cerine</h4>
            <h4 className={styles.role}>Backend dev & designer</h4>
            <p className={styles.year}> 2nd Year · MI</p>
            <p className={styles.desc}>intoduction</p>
            <div className={styles.links}>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                GitHub
              </a>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className={styles.member}>
            <div className={`${styles.avatar} ${styles["av-orange"]}`}>K</div>
            <h4 className={styles.name}>Khlil Ikram</h4>
            <h4 className={styles.role}>Backend dev & designer</h4>
            <p className={styles.year}> 2nd Year · MI</p>
            <p className={styles.desc}>intoduction</p>
            <div className={styles.links}>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                GitHub
              </a>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className={styles.member}>
            <div className={`${styles.avatar} ${styles["av-pink"]}`}>I</div>
            <h4 className={styles.name}>Bedad ines</h4>
            <h4 className={styles.role}>Blockchain dev & team leader</h4>
            <p className={styles.year}> 2nd Year · MI</p>
            <p className={styles.desc}>intoduction</p>
            <div className={styles.links}>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                GitHub
              </a>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className={styles.member}>
            <div className={`${styles.avatar} ${styles["av-teal"]}`}>R</div>
            <h4 className={styles.name}>Baghdadi Abderrahim Wael</h4>
            <h4 className={styles.role}>Blockchain dev</h4>
            <p className={styles.year}> 2nd Year · MI</p>
            <p className={styles.desc}>intoduction</p>
            <div className={styles.links}>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                GitHub
              </a>
              <a
                href=""
                target="_blank"
                rel="noreferrer"
                className={styles.linkBtn}
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <h3>
          © 2026 <span>TrustMyDegree</span> · ENSTA Algeria · All rights
          reserved
        </h3>
      </footer>
    </div>
  );
}

export default Creators;

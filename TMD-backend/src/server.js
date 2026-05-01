const express = require("express");
const cors = require("cors");
const path = require("path");
const fileUpload = require("express-fileupload");
const prisma = require("./config/prisma");
const { verifyCertificate, getCertificateData } = require("./services/blockchain.service");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.endsWith(".vercel.app") ||
        origin === process.env.FRONTEND_URL
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/student", require("./routes/student"));
app.use("/api/contact", require("./routes/contact"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/logo/ensta", (req, res) => {
  res.sendFile(path.resolve("src/utils/logoensta.png"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TrustMyDegree API is running" });
});

const verifyController = require("./controllers/verifyController");
app.post("/api/verify", verifyController.verifyCertificate);

prisma
  .$connect()
  .then(() => {
    console.log("TrustMyDegree Database connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });

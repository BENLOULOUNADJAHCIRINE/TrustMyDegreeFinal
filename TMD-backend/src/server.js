const express = require("express");
const cors = require("cors");
const path = require("path");
const fileUpload = require("express-fileupload");
const prisma = require("./config/prisma");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));

// routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/student", require("./routes/student"));
app.use("/api/verify", require("./routes/verify"));
app.use("/api/contact", require("./routes/contact"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TrustMyDegree API is running" });
});

prisma
  .$connect()
  .then(() => console.log("trustmydegree database connected"))
  .catch((err) => console.error("error in connection to database", err));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

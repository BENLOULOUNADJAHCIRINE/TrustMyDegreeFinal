const express = require("express");
const router = express.Router();
const {
  login,
  changePassword,
  seedSuperAdmin,
  getUser,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} = require("../controllers/authController");
const { protect, isAdmin } = require("../middleware/auth");

router.post("/login", login);
router.put("/change-password", changePassword);
router.post("/seed-super-admin", protect, isAdmin, seedSuperAdmin);
router.get("/user", protect, getUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);
module.exports = router;

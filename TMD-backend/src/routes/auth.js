const express = require("express");
const router = express.Router();
const {
  login,
  changePassword,
  seedSuperAdmin,
  getUser,
} = require("../controllers/authController");
const { protect, isAdmin } = require("../middleware/auth");

router.post("/login", login);
router.put("/change-password", changePassword);
router.post("/seed-super-admin", protect, isAdmin, seedSuperAdmin);
router.get("/user", protect, getUser);
module.exports = router;

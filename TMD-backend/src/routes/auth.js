const express = require("express");
const router = express.Router();
const {
  login,
  changePassword,
  seedSuperAdmin,
  getUser,
} = require("../controllers/authController");

router.post("/login", login);
router.put("/change-password", changePassword);
router.post("/seed-super-admin", seedSuperAdmin);
router.get("/user", getUser);
module.exports = router;

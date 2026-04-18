const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/auth");
const {
  dashboard,
  getRequests,
  handleRequestStatus,
  handleRequestDocument,
  revokeCertificate,
  changePassword,
  syncStudents,
  importDiplomas,
  getAllCertificates,
  getStatistics,
  downloadCertificate,
  exportCertificates,
  downloadRequestFile,
} = require("../controllers/adminController");

router.get("/dashboard", protect, isAdmin, dashboard);
router.get("/requests", protect, isAdmin, getRequests);
router.put("/requests/:id/status", protect, isAdmin, handleRequestStatus);
router.get("/certificates/export", protect, isAdmin, exportCertificates);
router.put("/requests/:id/upload", protect, isAdmin, handleRequestDocument);
router.put("/certificates/:id/revoke", protect, isAdmin, revokeCertificate);
router.put("/settings", protect, isAdmin, changePassword);
router.post("/sync-students", protect, isAdmin, syncStudents);
router.post("/import", protect, isAdmin, importDiplomas);
router.get("/certificates", protect, isAdmin, getAllCertificates);
router.get("/statistics", protect, isAdmin, getStatistics);
router.get("/certificates/:id/download", protect, isAdmin, downloadCertificate);
router.get('/requests/:id/download', protect, isAdmin, downloadRequestFile);

module.exports = router;

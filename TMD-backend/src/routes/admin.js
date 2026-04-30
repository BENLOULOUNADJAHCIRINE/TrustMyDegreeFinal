const express = require("express");
const router = express.Router();
const { protect, isAdmin, isSuperAdmin } = require("../middleware/auth");
const {
  dashboard,
  getRequests,
  handleRequestStatus,
  handleRequestDocument,
  revokeCertificate,
  bulkRevokeCertificates,
  unrevokeCertificate,
  changePassword,
  syncStudents,
  importDiplomas,
  getAllCertificates,
  getStatistics,
  downloadCertificate,
  exportCertificates,
  exportRequests,
  downloadRequestFile,
  getAuditTrail,
  uploadAvatar,
  issueOne,
} = require("../controllers/adminController");

router.get("/dashboard", protect, isAdmin, dashboard);
router.get("/requests", protect, isAdmin, getRequests);
router.put("/requests/:id/status", protect, isAdmin, handleRequestStatus);
router.get("/requests/export", protect, isAdmin, exportRequests);
router.get("/certificates/export", protect, isAdmin, exportCertificates);
router.put("/requests/:id/upload", protect, isAdmin, handleRequestDocument);
router.put("/certificates/bulk-revoke", protect, isAdmin, bulkRevokeCertificates);
router.put("/certificates/:id/revoke", protect, isAdmin, revokeCertificate);
router.put("/certificates/:id/unrevoke", protect, isAdmin, unrevokeCertificate);  
router.put("/settings", protect, isAdmin, changePassword);
router.post("/sync-students", protect, isAdmin, syncStudents);
router.post("/import", protect, isAdmin, importDiplomas);
router.post("/issue-one", protect, isAdmin, issueOne);  
router.get("/certificates", protect, isAdmin, getAllCertificates);
router.get("/statistics", protect, isAdmin, getStatistics);
router.get("/certificates/:id/download", protect, isAdmin, downloadCertificate);
router.get('/requests/:id/download', protect, isAdmin, downloadRequestFile);
router.get("/audit-trail", protect, isSuperAdmin, getAuditTrail);
router.post("/avatar", protect, isAdmin, uploadAvatar);

module.exports = router;

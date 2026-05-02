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
  getStudents,
  getStudentCertificates,
  deleteStudent,
  getAuditStats,
} = require("../controllers/adminController");

router.get("/dashboard", protect, isAdmin, dashboard);
router.put("/settings", protect, isAdmin, changePassword);
router.post("/avatar", protect, isAdmin, uploadAvatar);
router.get("/audit-trail/stats", protect, isSuperAdmin, getAuditStats);
router.get("/audit-trail", protect, isSuperAdmin, getAuditTrail);
router.get("/statistics", protect, isAdmin, getStatistics);

// Sync / import / issue
router.post("/sync-students", protect, isAdmin, syncStudents);
router.post("/import", protect, isAdmin, importDiplomas);
router.post("/issue-one", protect, isAdmin, issueOne);

// Requests — specific before :id
router.get("/requests/export", protect, isAdmin, exportRequests);
router.get("/requests", protect, isAdmin, getRequests);
router.put("/requests/:id/status", protect, isAdmin, handleRequestStatus);
router.put("/requests/:id/upload", protect, isAdmin, handleRequestDocument);
router.get("/requests/:id/download", protect, isAdmin, downloadRequestFile);

// Certificates — specific before :id
router.get("/certificates/export", protect, isAdmin, exportCertificates);
router.put("/certificates/bulk-revoke", protect, isAdmin, bulkRevokeCertificates);
router.get("/certificates", protect, isAdmin, getAllCertificates);
router.get("/certificates/:id/download", protect, isAdmin, downloadCertificate);
router.put("/certificates/:id/revoke", protect, isAdmin, revokeCertificate);
router.put("/certificates/:id/unrevoke", protect, isAdmin, unrevokeCertificate);

// Students — specific before :id
router.get("/students", protect, isAdmin, getStudents);
router.get("/students/:id/certificates", protect, isAdmin, getStudentCertificates);
router.delete("/students/:id", protect, isAdmin, deleteStudent);

module.exports = router;

const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");

const adminController = require("../controllers/admin/admin.controller");

// Saare routes ke liye valid Admin JWT chahiye.
router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/dashboard", adminController.getDashboard);
router.get("/users", adminController.getUsers);
router.patch("/users/:id/status", adminController.updateUserStatus);

router.post("/vendors", upload.single("logo"), adminController.createVendor);
router.post("/users/:id/vendor-profile", adminController.createVendorProfileForUser);
router.patch("/vendors/:id/approval", adminController.updateVendorApproval);

module.exports = router;
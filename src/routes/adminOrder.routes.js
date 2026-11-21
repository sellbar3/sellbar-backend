const express = require("express");
const router = express.Router();

// GET Admin Orders
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin Orders API Working",
  });
});

module.exports = router;
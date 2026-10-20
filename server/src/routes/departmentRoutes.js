const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// Public departments list (used in registration and academic lookups)
router.get('/', departmentController.getDepartments);

module.exports = router;

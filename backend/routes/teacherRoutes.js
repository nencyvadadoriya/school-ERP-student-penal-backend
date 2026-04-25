const express = require('express');
const router = express.Router();
const {
  registerTeacher,
  loginTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require('../controllers/teacherController');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/login', loginTeacher);

// Admin only routes
router.post('/register', auth, adminAuth, upload.single('profile_image'), registerTeacher);
router.delete('/:id', auth, adminAuth, deleteTeacher);

// Protected routes
router.get('/', auth, getAllTeachers);
router.get('/:id', auth, getTeacherById);
router.patch('/:id', auth, upload.single('profile_image'), updateTeacher);

module.exports = router;

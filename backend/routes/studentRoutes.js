const express = require('express');
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  changePassword,
  changePin,
  fixExistingClassCodes,
  updateProfileImage,
  updateFCMToken,
} = require('../controllers/studentController');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/update-fcm-token', auth, updateFCMToken);
router.post('/login', loginStudent);

// Protected routes (Student/Teacher/Admin)
router.post('/change-password', auth, changePassword);
router.post('/change-pin', auth, changePin);
router.post('/profile-image', auth, upload.single('profile_image'), updateProfileImage);

// Admin only routes
router.post('/register', auth, adminAuth, upload.single('profile_image'), registerStudent);
router.post('/fix-class-codes', auth, adminAuth, fixExistingClassCodes);
router.delete('/:id', auth, adminAuth, deleteStudent);

// Protected routes
router.get('/', auth, getAllStudents);
router.get('/:id', auth, getStudentById);
router.patch('/:id', auth, upload.single('profile_image'), updateStudent);

module.exports = router;

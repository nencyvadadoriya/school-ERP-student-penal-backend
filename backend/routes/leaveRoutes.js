const express = require('express');
const router = express.Router();
const {
  applyStudentLeave, getStudentLeaves, updateStudentLeave, deleteStudentLeave,
  applyTeacherLeave, getTeacherLeaves, updateTeacherLeave,
} = require('../controllers/leaveController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/student', auth, applyStudentLeave);
router.get('/student', auth, getStudentLeaves);
router.patch('/student/:id', auth, updateStudentLeave);
router.delete('/student/:id', auth, adminAuth, deleteStudentLeave);

router.post('/teacher', auth, applyTeacherLeave);
router.get('/teacher', auth, getTeacherLeaves);
router.patch('/teacher/:id', auth, updateTeacherLeave);

module.exports = router;

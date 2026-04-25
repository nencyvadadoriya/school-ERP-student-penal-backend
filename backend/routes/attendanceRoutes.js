const express = require('express');
const router = express.Router();
const { markAttendance, getAttendance, getStudentAttendance, deleteAttendance } = require('../controllers/attendanceController');
const { auth, adminAuth, teacherAuth } = require('../middleware/auth');

router.post('/', auth, teacherAuth, markAttendance);
router.get('/', auth, getAttendance);
router.get('/student', auth, getStudentAttendance);
router.delete('/:id', auth, adminAuth, deleteAttendance);

module.exports = router;

const express = require('express');
const router = express.Router();
const { createHomework, getAllHomework, getHomeworkById, updateHomework, deleteHomework } = require('../controllers/homeworkController');
const { auth, adminAuth, teacherAuth } = require('../middleware/auth');

router.post('/', auth, teacherAuth, createHomework);
router.get('/', auth, getAllHomework);
router.get('/:id', auth, getHomeworkById);
router.patch('/:id', auth, teacherAuth, updateHomework);
router.delete('/:id', auth, teacherAuth, deleteHomework);

module.exports = router;

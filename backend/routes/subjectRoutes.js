const express = require('express');
const router = express.Router();
const {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  getSubjectsByClass,
} = require('../controllers/subjectController');

const { auth: verifyToken, adminAuth: isAdmin } = require('../middleware/auth');

// All routes protected
router.use(verifyToken);

// GET  /api/subject           - Get all subjects (with filters)
// POST /api/subject           - Create new subject (admin only)
router.route('/')
  .get(getAllSubjects)
  .post(isAdmin, createSubject);

// GET /api/subject/by-class   - Get subjects grouped by std
router.get('/by-class', getSubjectsByClass);

// GET    /api/subject/:id     - Get single subject
// PATCH  /api/subject/:id     - Update subject (admin only)
// DELETE /api/subject/:id     - Soft delete subject (admin only)
router.route('/:id')
  .get(getSubjectById)
  .patch(isAdmin, updateSubject)
  .delete(isAdmin, deleteSubject);

module.exports = router;
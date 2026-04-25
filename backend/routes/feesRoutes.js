const express = require('express');
const router = express.Router();
const { createFee, getAllFees, getFeeById, updateFee, deleteFee, getFeeSummary } = require('../controllers/feesController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/', auth, adminAuth, createFee);
router.get('/', auth, getAllFees);
router.get('/summary', auth, adminAuth, getFeeSummary);
router.get('/:id', auth, getFeeById);
router.patch('/:id', auth, adminAuth, updateFee);
router.delete('/:id', auth, adminAuth, deleteFee);

module.exports = router;

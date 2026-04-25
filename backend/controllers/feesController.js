const Fees = require('../models/Fees');

const createFee = async (req, res) => {
  try {
    const receipt_number = 'RCP' + Date.now();
    const fee = await Fees.create({ ...req.body, receipt_number });
    res.status(201).json({ success: true, message: 'Fee record created', data: fee });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllFees = async (req, res) => {
  try {
    const { gr_number, status, academic_year } = req.query;
    const filter = { is_delete: false };
    if (gr_number) filter.gr_number = gr_number;
    if (status) filter.status = status;
    if (academic_year) filter.academic_year = academic_year;
    const data = await Fees.find(filter).populate('student_id', '-password').sort({ due_date: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getFeeById = async (req, res) => {
  try {
    const data = await Fees.findOne({ _id: req.params.id, is_delete: false }).populate('student_id', '-password');
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateFee = async (req, res) => {
  try {
    const { amount_paid, payment_mode, paid_date, status } = req.body;
    const fee = await Fees.findOne({ _id: req.params.id, is_delete: false });
    if (!fee) return res.status(404).json({ success: false, message: 'Not found' });
    if (amount_paid !== undefined) fee.amount_paid = amount_paid;
    if (payment_mode) fee.payment_mode = payment_mode;
    if (paid_date) fee.paid_date = paid_date;
    if (status) fee.status = status;
    // Auto-compute status
    if (fee.amount_paid >= fee.total_amount) fee.status = 'Paid';
    else if (fee.amount_paid > 0) fee.status = 'Partial';
    await fee.save();
    res.json({ success: true, message: 'Updated', data: fee });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteFee = async (req, res) => {
  try {
    await Fees.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getFeeSummary = async (req, res) => {
  try {
    const fees = await Fees.find({ is_delete: false });
    const totalAmount = fees.reduce((s, f) => s + f.total_amount, 0);
    const totalCollected = fees.reduce((s, f) => s + f.amount_paid, 0);
    const pending = fees.filter(f => f.status === 'Pending' || f.status === 'Partial');
    res.json({ success: true, data: { totalAmount, totalCollected, pendingCount: pending.length, pendingAmount: totalAmount - totalCollected } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createFee, getAllFees, getFeeById, updateFee, deleteFee, getFeeSummary };

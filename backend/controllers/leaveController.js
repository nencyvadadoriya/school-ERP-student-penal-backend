const StudentLeave = require('../models/StudentLeave');
const TeacherLeave = require('../models/TeacherLeave');

// Student Leave
const applyStudentLeave = async (req, res) => {
  try {
    const leave = await StudentLeave.create(req.body);
    res.status(201).json({ success: true, message: 'Leave applied', data: leave });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getStudentLeaves = async (req, res) => {
  try {
    const { gr_number, status, class_code, class_codes } = req.query;
    const filter = { is_delete: false };
    if (gr_number) filter.gr_number = gr_number;
    if (status) filter.status = status;
    if (class_code) filter.class_code = class_code;
    if (class_codes) {
      const codes = String(class_codes)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (codes.length) filter.class_code = { $in: codes };
    }
    const data = await StudentLeave.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateStudentLeave = async (req, res) => {
  try {
    const data = await StudentLeave.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteStudentLeave = async (req, res) => {
  try {
    await StudentLeave.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Teacher Leave
const applyTeacherLeave = async (req, res) => {
  try {
    const leave = await TeacherLeave.create(req.body);
    res.status(201).json({ success: true, message: 'Leave applied', data: leave });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getTeacherLeaves = async (req, res) => {
  try {
    const { teacher_code, status } = req.query;
    const filter = { is_delete: false };
    if (teacher_code) filter.teacher_code = teacher_code;
    if (status) filter.status = status;
    const data = await TeacherLeave.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateTeacherLeave = async (req, res) => {
  try {
    const data = await TeacherLeave.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
  applyStudentLeave, getStudentLeaves, updateStudentLeave, deleteStudentLeave,
  applyTeacherLeave, getTeacherLeaves, updateTeacherLeave,
};

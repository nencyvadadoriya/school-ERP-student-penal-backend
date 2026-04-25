const Homework = require('../models/Homework');

const createHomework = async (req, res) => {
  try {
    const hw = await Homework.create(req.body);
    res.status(201).json({ success: true, message: 'Homework created', data: hw });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllHomework = async (req, res) => {
  try {
    const { class_code, teacher_code } = req.query;
    console.log('--- DEBUG: getAllHomework ---');
    console.log('Query Params:', { class_code, teacher_code });
    console.log('Auth User:', req.user);
    
    const filter = { is_delete: false };
    
    // If a class_code is provided in query, use it
    if (class_code) {
      filter.class_code = class_code;
    } 
    // If no class_code in query but user is a student, force their class_code
    else if (req.user && req.user.role === 'student') {
      const Student = require('../models/Student');
      const student = await Student.findById(req.user.id);
      console.log('Student found in DB:', student ? { id: student._id, class_code: student.class_code } : 'NOT FOUND');
      if (student && student.class_code) {
        filter.class_code = student.class_code;
      }
    }

    if (teacher_code) filter.teacher_code = teacher_code;
    
    console.log('Final Homework Filter:', filter);
    const data = await Homework.find(filter).sort({ due_date: 1 });
    console.log('Homework count found:', data.length);
    console.log('----------------------------');
    
    res.json({ success: true, count: data.length, data });
  } catch (e) { 
    console.error('getAllHomework Error:', e);
    res.status(500).json({ success: false, message: e.message }); 
  }
};

const getHomeworkById = async (req, res) => {
  try {
    const data = await Homework.findOne({ _id: req.params.id, is_delete: false });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateHomework = async (req, res) => {
  try {
    const data = await Homework.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteHomework = async (req, res) => {
  try {
    await Homework.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createHomework, getAllHomework, getHomeworkById, updateHomework, deleteHomework };

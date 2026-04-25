const mongoose = require('mongoose');
const Class = require('../models/Class');

// Create a new class
exports.createClass = async (req, res) => {
  try {
    const { standard, division, medium, stream, shift, subjects } = req.body;

    const existingClass = await Class.findOne({ standard, division, medium, is_delete: false });
    if (existingClass) {
      return res.status(400).json({ success: false, message: 'Class already exists' });
    }

    const newClass = new Class({ 
      standard, 
      division, 
      medium, 
      stream, 
      shift,
      subjects: subjects || [],
      class_code: `${standard}-${division}-${medium}`
    });
    await newClass.save();

    res.status(201).json({ success: true, message: 'Class created successfully', data: newClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get class by code
exports.getClassByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const raw = String(code || '').trim();
    if (!raw) return res.status(400).json({ success: false, message: 'class code is required' });

    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const stripStdPrefix = (s) => String(s || '').trim().replace(/^STD[-\s]*/i, '');
    const toCanonical = (s) => {
      const unified = stripStdPrefix(s).replace(/\s+/g, '-');
      const parts = unified.split('-').map(p => String(p || '').trim()).filter(Boolean);
      return parts.length >= 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : unified;
    };

    const canonical = toCanonical(raw);

    let classData = null;
    if (mongoose.Types.ObjectId.isValid(raw)) {
      classData = await Class.findOne({ _id: raw, is_delete: false });
      if (classData) return res.status(200).json({ success: true, data: classData });
    }

    classData = await Class.findOne({ class_code: canonical, is_delete: false });
    if (classData) return res.status(200).json({ success: true, data: classData });

    const parts = canonical.split('-');
    const searchObj = { is_delete: false };
    if (parts[0]) searchObj.standard = parts[0];
    if (parts[1]) searchObj.division = parts[1];
    if (parts[2]) searchObj.medium = parts[2];

    classData = await Class.findOne(searchObj);
    if (!classData) {
      const all = await Class.find({ is_delete: false }).lean();
      const target = normalize(raw);
      classData = all.find(c => normalize(c.class_code) === target || normalize(`${c.standard}-${c.division}-${c.medium}`) === target) || null;
    }
    
    if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });
    res.status(200).json({ success: true, data: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all classes
exports.getAllClasses = async (req, res) => {
  try {
    const { standard, division, medium, stream, shift, is_active } = req.query;
    const filter = { is_delete: false };

    if (standard) filter.standard = standard;
    if (division) filter.division = division;
    if (medium) filter.medium = medium;
    if (stream) filter.stream = stream;
    if (shift) filter.shift = shift;
    if (is_active !== undefined) filter.is_active = is_active === 'true';

    const classes = await Class.find(filter).sort({ standard: 1, division: 1 });
    res.status(200).json({ success: true, count: classes.length, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// get class
exports.getClassById = async (req, res) => {
  try {
    const classData = await Class.findOne({ _id: req.params.id, is_delete: false });
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    res.status(200).json({ success: true, data: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update class
exports.updateClass = async (req, res) => {
  try {
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Class updated successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Soft delete class
exports.deleteClass = async (req, res) => {
  try {
    const deletedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: { is_delete: true, is_active: false } },
      { new: true }
    );

    if (!deletedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign teacher to class
exports.assignTeacher = async (req, res) => {
  try {
    const { teacher_code } = req.body;
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: { teacher_code } },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Teacher assigned successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NEW: Add subjects to class
exports.addSubjects = async (req, res) => {
  try {
    const { subjects } = req.body;
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: { subjects: subjects } },
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Subjects added successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NEW: Add single subject to class
exports.addSingleSubject = async (req, res) => {
  try {
    const { subject } = req.body;
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $addToSet: { subjects: subject } }, // $addToSet prevents duplicates
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Subject added successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NEW: Remove subject from class
exports.removeSubject = async (req, res) => {
  try {
    const { subject } = req.body;
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $pull: { subjects: subject } },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Subject removed successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
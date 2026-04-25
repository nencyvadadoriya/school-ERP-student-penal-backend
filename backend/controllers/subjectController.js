const Subject = require('../models/Subject');

// Create a new subject
exports.createSubject = async (req, res) => {
  try {
    const { subject_code, subject_name, subject_level, std, medium, stream } = req.body;

    // Check if subject_code already exists
    const existing = await Subject.findOne({ subject_code, is_delete: false });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Subject code already exists' });
    }

    const newSubject = new Subject({ subject_code, subject_name, subject_level, std, medium, stream });
    await newSubject.save();

    res.status(201).json({ success: true, message: 'Subject created successfully', data: newSubject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Subject code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const { subject_level, std, medium, stream, is_active } = req.query;
    const filter = { is_delete: false };

    if (subject_level) filter.subject_level = subject_level;
    if (std) filter.std = std;
    if (medium) filter.medium = medium;
    if (stream) filter.stream = stream;

    const subjects = await Subject.find(filter).sort({ std: 1, subject_name: 1 });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get subject by ID
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, is_delete: false });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update subject
exports.updateSubject = async (req, res) => {
  try {
    const updatedSubject = await Subject.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({ success: true, message: 'Subject updated successfully', data: updatedSubject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Subject code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Soft delete subject
exports.deleteSubject = async (req, res) => {
  try {
    const deletedSubject = await Subject.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: { is_delete: true } },
      { new: true }
    );

    if (!deletedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get subjects grouped by std (class-wise)
exports.getSubjectsByClass = async (req, res) => {
  try {
    const { medium, stream } = req.query;
    const filter = { is_delete: false };

    if (medium) filter.medium = medium;
    if (stream) filter.stream = stream;

    const subjects = await Subject.find(filter).sort({ std: 1, subject_name: 1 });

    // Group by std
    const grouped = {};
    subjects.forEach(sub => {
      const key = sub.std;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(sub);
    });

    res.status(200).json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
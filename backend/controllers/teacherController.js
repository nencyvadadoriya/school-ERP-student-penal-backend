const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const { uploadToCloudinary } = require('../config/cloudinary');

// Helper to accept either an array, a JSON-string, or a comma-separated string
const parseArrayInput = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // not JSON, fallthrough to comma-splitting
    }
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// Generate Teacher Code
const generateTeacherCode = async () => {
  const count = await Teacher.countDocuments();
  const year = new Date().getFullYear();
  return `TCH${year}${String(count + 1).padStart(5, '0')}`;
};

// Register Teacher
const registerTeacher = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      email,
      password,
      pin,
      experience,
      about,
      assigned_class,
      subjects,
    } = req.body;

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ email, is_delete: false });

    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Teacher with this email already exists',
      });
    }

    // Generate teacher code
    const teacher_code = await generateTeacherCode();

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/teachers');
      profileImageUrl = uploadResult.url;
    }

    const assignedClassArray = parseArrayInput(assigned_class);
    const subjectsArray = parseArrayInput(subjects);

    // Ensure password exists; if not provided, auto-generate a temporary one
    let plainPassword = password;
    if (!plainPassword) {
      plainPassword = Math.random().toString(36).slice(-8);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create teacher
    const teacher = await Teacher.create({
      teacher_code,
      first_name,
      last_name,
      phone,
      email,
      password: hashedPassword,
      pin,
      profile_image: profileImageUrl,
      experience: experience ? Number(experience) : 0,
      about,
      assigned_class: assignedClassArray,
      subjects: subjectsArray,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: teacher._id, email: teacher.email, teacher_code: teacher.teacher_code, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response and include generated password if created
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    const responsePayload = {
      success: true,
      message: 'Teacher registered successfully',
      data: teacherResponse,
      token,
    };

    if (!password) {
      responsePayload.generated_password = plainPassword;
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Error in registerTeacher:', error);
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }

    // Handle duplicate key errors (unique indexes)
    if (error.code === 11000) {
      const dupKey = Object.keys(error.keyValue || {}).join(', ');
      return res.status(400).json({ success: false, message: `Duplicate value for field(s): ${dupKey}` });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering teacher',
      error: error.message,
    });
  }
};

// Login Teacher
const loginTeacher = async (req, res) => {
  try {
    const { email, teacher_code, password } = req.body;

    // Find teacher by email or teacher_code
    const query = { is_delete: false };
    if (email) query.email = email;
    else if (teacher_code) query.teacher_code = teacher_code;
    else {
      return res.status(400).json({ success: false, message: 'Email or teacher_code required' });
    }

    const teacher = await Teacher.findOne(query);

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (!teacher.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, teacher.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: teacher._id, email: teacher.email, teacher_code: teacher.teacher_code, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: teacherResponse,
      token,
    });
  } catch (error) {
    console.error('Error in loginTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// Get All Teachers
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({ is_delete: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    console.error('Error in getAllTeachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message,
    });
  }
};

// Get Single Teacher
const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findOne({ _id: id, is_delete: false }).select('-password');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    res.json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    console.error('Error in getTeacherById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher',
      error: error.message,
    });
  }
};

// Update Teacher
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      phone,
      pin,
      experience,
      about,
      assigned_class,
      subjects,
      is_active,
    } = req.body;

    // Check if teacher exists
    const teacher = await Teacher.findOne({ _id: id, is_delete: false });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    // Handle profile image upload
    let profileImageUrl = teacher.profile_image;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/teachers');
      profileImageUrl = uploadResult.url;
    }

    // Parse arrays (accept array, JSON-string, or comma-separated string)
    const assignedClassArray = assigned_class ? parseArrayInput(assigned_class) : teacher.assigned_class;
    const subjectsArray = subjects ? parseArrayInput(subjects) : teacher.subjects;

    // Update teacher
    teacher.first_name = first_name;
    teacher.last_name = last_name;
    teacher.phone = phone;
    teacher.pin = pin;
    teacher.profile_image = profileImageUrl;
    if (typeof experience !== 'undefined') {
      teacher.experience = Number(experience);
    }
    teacher.about = about;
    teacher.assigned_class = assignedClassArray;
    teacher.subjects = subjectsArray;
    teacher.is_active = is_active;

    await teacher.save();

    // Remove password from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: teacherResponse,
    });
  } catch (error) {
    console.error('Error in updateTeacher:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    if (error.code === 11000) {
      const dupKey = Object.keys(error.keyValue || {}).join(', ');
      return res.status(400).json({ success: false, message: `Duplicate value for field(s): ${dupKey}` });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating teacher',
      error: error.message,
    });
  }
};

// Delete Teacher (Soft Delete)
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if teacher exists
    const teacher = await Teacher.findOne({ _id: id, is_delete: false });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    // Soft delete
    teacher.is_delete = true;
    await teacher.save();

    res.json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting teacher',
      error: error.message,
    });
  }
};

module.exports = {
  registerTeacher,
  loginTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};

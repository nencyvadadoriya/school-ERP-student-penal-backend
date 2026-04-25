const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { uploadToCloudinary } = require('../config/cloudinary');

// Generate GR Number
const generateGRNumber = async () => {
  const count = await Student.countDocuments();
  const year = new Date().getFullYear();
  return `GR${year}${String(count + 1).padStart(5, '0')}`;
};

// Register Student
const registerStudent = async (req, res) => {
  try {
    const {
      std,
      roll_no,
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin,
      class_code,
      password,
      fees,
      shift,
      stream,
    } = req.body;


    // Generate GR number
    const gr_number = await generateGRNumber();

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/students');
      profileImageUrl = uploadResult.url;
    }

    // Generate class_code if not provided or to ensure consistency
    const generatedClassCode = `${std}-${req.body.division || 'A'}-${req.body.medium || 'English'}`;
    
    // Create student
    const student = await Student.create({
      gr_number,
      std,
      roll_no,
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin,
      division: req.body.division || 'A',
      medium: req.body.medium || 'English',
      class_code: class_code || generatedClassCode,
      password: hashedPassword,
      profile_image: profileImageUrl,
      fees: fees || 0,
      shift,
      stream,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: student._id, gr_number: student.gr_number, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    const responsePayload = {
      success: true,
      message: 'Student registered successfully',
      data: studentResponse,
      token,
    };

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Error in registerStudent:', error);
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
      message: 'Error registering student',
      error: error.message,
    });
  }
};

// Login Student
const loginStudent = async (req, res) => {
  try {
    const { gr_number, password, pin } = req.body;

    // Find student
    const student = await Student.findOne({ gr_number, is_delete: false });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'GR number is wrong',
      });
    }

    // Check if account is active
    if (!student.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.',
      });
    }

    // Verify password or pin
    if (password && pin) {
      const isPasswordValid = await bcrypt.compare(password, student.password);
      const isPinValid = String(pin) === String(student.pin);
      
      if (!isPasswordValid && !isPinValid) {
        return res.status(401).json({
          success: false,
          message: 'Password and PIN are wrong',
        });
      }
    } else if (password) {
      const isPasswordValid = await bcrypt.compare(password, student.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Password is wrong',
        });
      }
    } else if (pin) {
      const isPinValid = String(pin) === String(student.pin);
      if (!isPinValid) {
        return res.status(401).json({
          success: false,
          message: 'PIN is wrong',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Password or PIN required',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: student._id, gr_number: student.gr_number, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: studentResponse,
      token,
    });
  } catch (error) {
    console.error('Error in loginStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const studentId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    await student.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ success: false, message: 'Error updating password', error: error.message });
  }
};

// Change PIN
const changePin = async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    const studentId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (String(currentPin) !== String(student.pin)) {
      return res.status(400).json({ success: false, message: 'Current PIN does not match' });
    }

    student.pin = String(newPin);
    await student.save();

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error) {
    console.error('Error in changePin:', error);
    res.status(500).json({ success: false, message: 'Error updating PIN', error: error.message });
  }
};

// Get All Students
const getAllStudents = async (req, res) => {
  try {
    const { class_code } = req.query;
    const filter = { is_delete: false };

    const role = req.user?.role;
    if (role === 'teacher') {
      const teacherId = req.user?.id;
      const teacher = teacherId
        ? await Teacher.findOne({ _id: teacherId, is_delete: false }).select('assigned_class').lean()
        : null;
      const assigned = Array.isArray(teacher?.assigned_class) ? teacher.assigned_class.filter(Boolean) : [];

      if (assigned.length === 0) {
        return res.json({ success: true, count: 0, data: [] });
      }

      if (class_code) {
        const requested = String(class_code);
        if (!assigned.includes(requested)) {
          return res.json({ success: true, count: 0, data: [] });
        }
        filter.class_code = requested;
      } else {
        filter.class_code = { $in: assigned };
      }
    } else {
      if (class_code) filter.class_code = String(class_code);
    }

    const students = await Student.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// Get Single Student
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({ _id: id, is_delete: false }).select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Error in getStudentById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message,
    });
  }
};

// Update Student
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      std,
      roll_no,
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin,
      class_code,
      fees,
      shift,
      stream,
      is_active,
    } = req.body;

    // Check if student exists
    const student = await Student.findOne({ _id: id, is_delete: false });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Handle profile image upload
    let profileImageUrl = student.profile_image;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/students');
      profileImageUrl = uploadResult.url;
    }

    // Update student
    student.std = std;
    student.roll_no = roll_no;
    student.first_name = first_name;
    student.middle_name = middle_name;
    student.last_name = last_name;
    student.gender = gender;
    student.phone1 = phone1;
    student.phone2 = phone2;
    student.address = address;
    student.pin = pin;
    
    // Auto-generate class_code on update if it's currently undefined or if relevant fields changed
    const generatedClassCode = `${std}-${req.body.division || 'A'}-${req.body.medium || 'English'}`;
    student.class_code = class_code || generatedClassCode;
    student.division = req.body.division || student.division || 'A';
    student.medium = req.body.medium || student.medium || 'English';

    student.profile_image = profileImageUrl;
    student.fees = fees;
    student.shift = shift;
    student.stream = stream;
    student.is_active = is_active;

    await student.save();

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: studentResponse,
    });
  } catch (error) {
    console.error('Error in updateStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message,
    });
  }
};

// Delete Student (Soft Delete)
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const student = await Student.findOne({ _id: id, is_delete: false });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Soft delete
    student.is_delete = true;
    await student.save();

    res.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message,
    });
  }
};

// Bulk Update Class Codes for existing students
const fixExistingClassCodes = async (req, res) => {
  try {
    const students = await Student.find({ is_delete: false });
    let updatedCount = 0;

    for (const student of students) {
      const std = student.std || '1';
      const division = student.division || 'A';
      const medium = student.medium || 'English';
      
      const newClassCode = `${std}-${division}-${medium}`;
      
      if (student.class_code !== newClassCode) {
        student.class_code = newClassCode;
        await student.save();
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully updated class codes for ${updatedCount} students`,
    });
  } catch (error) {
    console.error('Error in fixExistingClassCodes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing class codes',
      error: error.message,
    });
  }
};

// Update Profile Image (For Student themselves)
const updateProfileImage = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { remove_profile_image } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Handle removal
    if (remove_profile_image === true || remove_profile_image === 'true') {
      student.profile_image = null;
    }

    // Handle upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/students');
      student.profile_image = uploadResult.url;
    }

    await student.save();

    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      data: studentResponse,
    });
  } catch (error) {
    console.error('Error in updateProfileImage:', error);
    res.status(500).json({ success: false, message: 'Error updating profile image', error: error.message });
  }
};

const updateFCMToken = async (req, res) => {
  try {
    const { token } = req.body;
    const studentId = req.user.id;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required' });
    await Student.findByIdAndUpdate(studentId, { $addToSet: { fcmTokens: token } });
    res.status(200).json({ success: true, message: 'FCM token updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  changePassword,
  changePin,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  fixExistingClassCodes,
  updateProfileImage,
  updateFCMToken,
};

const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Homework = require('../models/Homework');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Fees = require('../models/Fees');
const StudentLeave = require('../models/StudentLeave');
const TeacherLeave = require('../models/TeacherLeave');
const Notice = require('../models/Notice');

const getAdminDashboard = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalClasses, pendingStudentLeaves, pendingTeacherLeaves, feesDocs] = await Promise.all([
      Student.countDocuments({ is_delete: false, is_active: true }),
      Teacher.countDocuments({ is_delete: false, is_active: true }),
      Class.countDocuments({ is_delete: false }),
      StudentLeave.countDocuments({ status: 'Pending', is_delete: false }),
      TeacherLeave.countDocuments({ status: 'Pending', is_delete: false }),
      Fees.find({ is_delete: false }),
    ]);

    const feesCollected = feesDocs.reduce((s, f) => s + f.amount_paid, 0);
    const feesPending = feesDocs.reduce((s, f) => s + (f.total_amount - f.amount_paid), 0);

    // Today attendance %
    const today = new Date(); today.setHours(0,0,0,0);
    const todayAtt = await Attendance.find({ date: { $gte: today }, is_delete: false });
    let present = 0, attTotal = 0;
    todayAtt.forEach(a => { a.records.forEach(r => { attTotal++; if (r.status === 'Present' || r.status === 'Late') present++; }); });
    const attendancePercentage = attTotal > 0 ? Math.round((present / attTotal) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalStudents, totalTeachers, totalClasses,
        attendancePercentage,
        pendingLeaves: pendingStudentLeaves + pendingTeacherLeaves,
        feesCollected, feesPending,
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getTeacherDashboard = async (req, res) => {
  try {
    const teacher_code = req.user.teacher_code;
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [myClasses, upcomingExams, homeworkGiven, myLeaves] = await Promise.all([
      Class.find({ teacher_code, is_delete: false }),
      Exam.find({ teacher_code, exam_date: { $gte: today }, is_delete: false }).limit(5),
      Homework.countDocuments({ teacher_code, is_delete: false }),
      TeacherLeave.find({ teacher_code, is_delete: false }).sort({ createdAt: -1 }).limit(5),
    ]);

    const classCodes = myClasses.map(c => c.class_code);
    const totalStudentsInClasses = await Student.countDocuments({ class_code: { $in: classCodes }, is_delete: false });

    // Check if today's attendance was marked
    const todayAtt = await Attendance.find({ class_code: { $in: classCodes }, date: { $gte: today, $lt: tomorrow }, is_delete: false });
    const attendancePending = classCodes.filter(cc => !todayAtt.find(a => a.class_code === cc)).length;

    res.json({
      success: true,
      data: { myClasses, totalStudentsInClasses, attendancePending, homeworkGiven, upcomingExams, myLeaves }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getStudentDashboard = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const today = new Date(); today.setHours(0,0,0,0);
    const upcomingWindowEnd = new Date(today);
    upcomingWindowEnd.setDate(upcomingWindowEnd.getDate() + 2);
    upcomingWindowEnd.setHours(23, 59, 59, 999);

    const [allAtt, pendingHomework, fees, upcomingExams, latestResults, notices] = await Promise.all([
      Attendance.find({ class_code: student.class_code, is_delete: false }),
      Homework.countDocuments({ class_code: student.class_code, due_date: { $gte: today }, is_delete: false }),
      Fees.find({ gr_number: student.gr_number, is_delete: false }),
      Exam.find({ class_code: student.class_code, exam_date: { $gte: today, $lte: upcomingWindowEnd }, is_delete: false }).limit(3).sort({ exam_date: 1 }),
      ExamResult.find({ gr_number: student.gr_number, is_delete: false }).populate('exam_id').sort({ createdAt: -1 }).limit(5),
      Notice.find({ is_delete: false, is_active: true }).sort({ createdAt: -1 }).limit(5),
    ]);

    let present = 0, total = 0;
    allAtt.forEach(a => {
      const r = a.records.find(r => r.gr_number === student.gr_number);
      if (r) { total++; if (r.status === 'Present' || r.status === 'Late') present++; }
    });
    const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const feeDue = fees.filter(f => f.status !== 'Paid').reduce((s, f) => s + (f.total_amount - f.amount_paid), 0);

    res.json({
      success: true,
      data: { student, attendancePercentage, pendingHomework, feeDue, upcomingExams, latestResults, notices }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAdminDashboard, getTeacherDashboard, getStudentDashboard };

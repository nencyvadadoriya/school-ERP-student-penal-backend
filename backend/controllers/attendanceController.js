const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// Mark / Create Attendance
const markAttendance = async (req, res) => {
  try {
    const { class_code, subject_code, teacher_code, date, records } = req.body;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Upsert for the day
    const existing = await Attendance.findOne({ class_code, date: attendanceDate, is_delete: false });
    if (existing) {
      existing.records = records;
      existing.subject_code = subject_code;
      existing.teacher_code = teacher_code;
      await existing.save();
      return res.json({ success: true, message: 'Attendance updated', data: existing });
    }

    const attendance = await Attendance.create({ class_code, subject_code, teacher_code, date: attendanceDate, records });
    res.status(201).json({ success: true, message: 'Attendance marked', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance by class & date range
const getAttendance = async (req, res) => {
  try {
    const { class_code, from, to } = req.query;
    const filter = { is_delete: false };
    if (class_code) filter.class_code = class_code;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const data = await Attendance.find(filter).sort({ date: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance summary for a student
const getStudentAttendance = async (req, res) => {
  try {
    const student_id = req.query.student_id || req.user?.id;
    const gr_number = req.query.gr_number || req.user?.gr_number;
    const class_code = req.query.class_code;

    const filter = { is_delete: false };
    const attendanceDocsAll = await Attendance.find(filter).sort({ date: 1 });

    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isValidClassCode = (v) => v != null && String(v).trim() && String(v) !== 'undefined' && String(v) !== 'null';

    let attendanceDocs = attendanceDocsAll;
    const classCodeRequested = isValidClassCode(class_code) ? String(class_code).trim() : '';
    if (classCodeRequested) {
      const requested = classCodeRequested;
      const requestedNorm = normalize(requested);

      // Try to extract std/div from class_code format like: "STD-1-A-English-Primary-Morning"
      let requestedStd = '';
      let requestedDiv = '';
      const parts = requested.split('-');
      if (parts.length >= 3) {
        requestedStd = String(parts[1]);
        requestedDiv = String(parts[2]);
      }

      attendanceDocs = attendanceDocsAll.filter((doc) => {
        const docClass = String(doc.class_code || '').trim();
        const docNorm = normalize(docClass);
        if (!docNorm || !requestedNorm) return false;

        // 1) Exact normalized match
        if (docNorm === requestedNorm) return true;

        // 2) Substring match (handles small formatting differences)
        if (docNorm.includes(requestedNorm) || requestedNorm.includes(docNorm)) return true;

        // 3) Component match by std/div if present
        if (requestedStd && requestedDiv) {
          const token = `-${requestedStd}-${requestedDiv}-`;
          if (docClass.includes(token)) return true;
        }

        return false;
      });

      // If class_code filtering results in no docs, fall back to all docs.
      // This avoids showing 0 when the stored class_code format differs from the student's profile.
      if (attendanceDocs.length === 0) {
        attendanceDocs = attendanceDocsAll;
      }
    }
    let present = 0, absent = 0, total = 0;
    const entries = [];

    const targetGr = String(gr_number || '').trim();
    const targetId = String(student_id || '').trim();

    console.log('[DEBUG] Student ID:', targetId);
    console.log('[DEBUG] GR Number:', targetGr);
    console.log('[DEBUG] Class Code Requested:', classCodeRequested || '(none)');
    console.log('[DEBUG] Found Docs count:', attendanceDocs.length);

    attendanceDocs.forEach((att, index) => {
      const rec = (att.records || []).find(r =>
        (targetGr && String(r.gr_number || '').trim() === targetGr) ||
        (targetId && String(r.student_id || '').trim() === targetId)
      );
      
      if (index === 0 && att.records && att.records.length > 0) {
        console.log('[DEBUG] First Doc Sample Record:', {
          gr: att.records[0].gr_number,
          sid: att.records[0].student_id
        });
      }

      if (rec) {
        total++;
        if (rec.status === 'Present' || rec.status === 'Late') present++;
        else absent++;
        entries.push({ date: att.date, status: rec.status });
      }
    });

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    res.json({ success: true, data: { present, absent, total, percentage, entries } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
const deleteAttendance = async (req, res) => {
  try {
    await Attendance.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { markAttendance, getAttendance, getStudentAttendance, deleteAttendance };

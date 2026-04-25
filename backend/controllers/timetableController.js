const TimeTable = require('../models/TimeTable');

const normalizeCode = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getCodeVariants = (code) => {
  const variants = new Set();
  const s = String(code || '').trim();
  variants.add(s);
  variants.add(normalizeCode(s));

  const withoutSTD = s.replace(/^STD[-\s]*/i, '');
  variants.add(withoutSTD);
  variants.add(normalizeCode(withoutSTD));

  const unified = withoutSTD.replace(/\s+/g, '-');
  variants.add(unified);
  variants.add(normalizeCode(unified));

  const parts = unified.split('-').map(p => String(p || '').trim()).filter(Boolean);
  if (parts.length >= 3) {
    const canonical = `${parts[0]}-${parts[1]}-${parts[2]}`;
    variants.add(canonical);
    variants.add(normalizeCode(canonical));
  }

  return Array.from(variants).filter(Boolean);
};

const createOrUpdateTimetable = async (req, res) => {
  try {
    let { class_code } = req.body;
    if (class_code) {
      class_code = normalizeCode(class_code);
    }
    const tt = await TimeTable.findOneAndUpdate(
      { class_code, is_delete: false },
      { ...req.body, class_code },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, message: 'Timetable saved', data: tt });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getTimetableByClass = async (req, res) => {
  try {
    const { class_code } = req.params;
    const variants = getCodeVariants(class_code);

    let data = await TimeTable.findOne({ class_code, is_delete: false });
    if (!data) {
      for (const variant of variants) {
        if (variant === class_code) continue;
        data = await TimeTable.findOne({ class_code: variant, is_delete: false });
        if (data) break;
      }
    }

    if (!data) {
      const all = await TimeTable.find({ is_delete: false }).lean();
      const target = normalizeCode(class_code);
      data = all.find(tt => normalizeCode(tt.class_code) === target) || null;
    }

    if (!data) return res.status(404).json({ success: false, message: 'Timetable not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllTimetables = async (req, res) => {
  try {
    const data = await TimeTable.find({ is_delete: false });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createOrUpdateTimetable, getTimetableByClass, getAllTimetables };

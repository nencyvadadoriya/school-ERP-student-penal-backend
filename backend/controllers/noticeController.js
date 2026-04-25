const Notice = require('../models/Notice');

const createNotice = async (req, res) => {
  try {
    const notice = await Notice.create(req.body);
    res.status(201).json({ success: true, message: 'Notice created', data: notice });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllNotices = async (req, res) => {
  try {
    const { target_audience } = req.query;
    const filter = { is_delete: false, is_active: true };
    if (target_audience) filter.$or = [{ target_audience }, { target_audience: 'All' }];
    const data = await Notice.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateNotice = async (req, res) => {
  try {
    const data = await Notice.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteNotice = async (req, res) => {
  try {
    await Notice.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createNotice, getAllNotices, updateNotice, deleteNotice };

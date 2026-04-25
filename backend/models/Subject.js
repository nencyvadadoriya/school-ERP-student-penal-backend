const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subject_code: {
    type: String,
    required: function() {
      // Require subject_code only for standards 10 and above
      const stdNum = Number(this.std);
      return stdNum >= 10;
    },
    trim: true,
  },
  subject_name: {
    type: String,
    required: true,
  },
  subject_level: {
    type: String,
    enum: ['Primary', 'Secondary', 'Higher Secondary'],
    required: true,
  },
  std: {
    type: String,
    required: true,
  },
  medium: {
    type: String,
    enum: ['English', 'Gujarati'],
    required: true,
    default: 'English',
  },
  stream: {
    type: String,
    enum: [
      'Science-Maths', 
      'Science-Bio', 
      'Commerce', 
      'Foundation',
      'Primary',
      'Upper Primary',
      'Secondary',
      'Higher Secondary'
    ],
  },
  is_delete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Compound partial index to ensure unique subject_code per medium when subject_code exists
subjectSchema.index(
  { subject_code: 1, medium: 1 },
  { unique: true, partialFilterExpression: { subject_code: { $exists: true, $ne: '' } } }
);

// Index for better query performance
subjectSchema.index({ std: 1, medium: 1 });
subjectSchema.index({ subject_name: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
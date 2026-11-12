import mongoose from 'mongoose';

const accountRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide full name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide email address'],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  requestedRole: {
    type: String,
    enum: ['student', 'organizer', 'professional', 'pro'],
    default: 'student',
  },
  organization: {
    type: String,
    trim: true,
    default: '',
  },
  purpose: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  adminNotes: {
    type: String,
    default: '',
  },
  generatedPassword: {
    type: String,
    default: '',
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const AccountRequest = mongoose.model('AccountRequest', accountRequestSchema);

export default AccountRequest;

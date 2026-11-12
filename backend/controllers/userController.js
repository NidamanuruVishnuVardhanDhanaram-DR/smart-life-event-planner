import User from '../models/User.js';
import AccountRequest from '../models/AccountRequest.js';
import { sendAccountCredentialsEmail } from '../utils/mailer.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Generate JWT Token
const generateToken = (id, role = 'student') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, organization } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!name?.trim() || !cleanEmail || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({
        code: 'USER_EXISTS',
        message: 'An account with this email already exists. Please sign in or reset your password.',
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role || 'student',
      organization: organization || '',
    });

    // Mark any pending AccountRequest for the same email as approved
    await AccountRequest.updateMany(
      { email: cleanEmail, status: 'pending' },
      { status: 'approved', reviewedAt: new Date(), adminNotes: 'Self-registered directly by user' }
    );

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization || '',
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ message: 'Please enter both email and password' });
    }

    // Check for user email
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';
    const isMatch = user && (
      (await user.matchPassword(password)) ||
      (trimmedPassword !== password && (await user.matchPassword(trimmedPassword)))
    );

    if (isMatch) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization || '',
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        allocatedBy: user.allocatedBy,
        allocatedRole: user.allocatedRole,
        avatar: user.avatar,
        preferences: user.preferences,
        eventsCreated: user.eventsCreated,
        eventsParticipating: user.eventsParticipating,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile (username / password / preferences)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.name !== undefined) {
      const trimmedName = String(req.body.name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: 'Username / display name cannot be empty' });
      }
      user.name = trimmedName;
    }

    if (req.body.email !== undefined) {
      const cleanEmail = String(req.body.email).trim().toLowerCase();
      if (!cleanEmail) {
        return res.status(400).json({ message: 'Email cannot be empty' });
      }
      if (cleanEmail !== user.email) {
        const existingEmailUser = await User.findOne({ email: cleanEmail });
        if (existingEmailUser) {
          return res.status(400).json({ message: 'An account with this email already exists' });
        }
        user.email = cleanEmail;
      }
    }

    if (req.body.organization !== undefined) {
      user.organization = String(req.body.organization).trim();
    }

    if (req.body.avatar !== undefined) {
      user.avatar = req.body.avatar;
    }

    if (req.body.preferences !== undefined) {
      user.preferences = req.body.preferences;
    }

    if (req.body.password) {
      const nextPassword = String(req.body.password).trim();
      if (nextPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      if (req.body.currentPassword) {
        const isCurrentValid = await user.matchPassword(String(req.body.currentPassword));
        if (!isCurrentValid) {
          return res.status(401).json({ message: 'Current password is incorrect' });
        }
      }
      user.password = nextPassword;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      organization: updatedUser.organization || '',
      avatar: updatedUser.avatar,
      preferences: updatedUser.preferences,
      token: generateToken(updatedUser._id, updatedUser.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (Plan Event / Admin)
// @route   GET /api/users
// @access  Private (Plan Event / Admin)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Allocate user role (Plan Event or Admin)
// @route   PUT /api/users/:id/role
// @access  Private (Plan Event / Admin)
const allocateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'organizer', 'professional', 'admin', 'pro'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    user.allocatedBy = req.user.id;
    user.allocatedRole = role;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      allocatedBy: user.allocatedBy,
      message: `Account successfully allocated to ${role}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await User.findByIdAndDelete(req.params.id);
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Raise an account request (Public for new users)
// @route   POST /api/users/request-account
// @access  Public
const requestAccount = async (req, res) => {
  try {
    const { name, email, phone, requestedRole, organization, purpose } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already has an active account
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An active account with this email already exists in MongoDB. Please log in directly.' 
      });
    }

    // Check if pending request exists
    const existingRequest = await AccountRequest.findOne({ email: cleanEmail, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ 
        message: 'You already have a pending account request. The Plan Event organizer will review it shortly.' 
      });
    }

    const accountRequest = await AccountRequest.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone || '',
      requestedRole: requestedRole || 'student',
      organization: organization || '',
      purpose: purpose || 'Account requested for smart life event planning',
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Account request raised successfully! The Plan Event organizer will review your request, allocate your account, and email your login ID and password.',
      request: accountRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all account requests (Plan Event / Admin)
// @route   GET /api/users/account-requests
// @access  Private (Plan Event / Admin)
const getAccountRequests = async (req, res) => {
  try {
    const requests = await AccountRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve account request & email ID + password (Plan Event / Admin)
// @route   POST /api/users/account-requests/:id/approve
// @access  Private (Plan Event / Admin)
const approveAccountRequest = async (req, res) => {
  try {
    const request = await AccountRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Account request not found' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ message: 'This request has already been approved' });
    }

    const assignedRole = req.body.role || request.requestedRole || 'student';
    // Generate secure temporary password
    const tempPassword = req.body.password || `Pass#${Math.floor(100000 + Math.random() * 900000)}`;

    // Create or update user in MongoDB
    let user = await User.findOne({ email: request.email });
    if (user) {
      user.name = request.name;
      user.password = tempPassword;
      user.role = assignedRole;
      user.allocatedBy = req.user.id;
      user.allocatedRole = assignedRole;
      user.isVerified = true;
      await user.save();
    } else {
      user = await User.create({
        name: request.name,
        email: request.email,
        password: tempPassword,
        role: assignedRole,
        allocatedBy: req.user.id,
        allocatedRole: assignedRole,
        isVerified: true,
      });
    }

    // Update AccountRequest document
    request.status = 'approved';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.generatedPassword = tempPassword;
    request.emailSent = true;
    request.adminNotes = req.body.adminNotes || 'Approved & provisioned by Plan Event organizer';
    await request.save();

    // Dispatch credentials email
    const emailResult = await sendAccountCredentialsEmail(
      request.email,
      request.name,
      { email: request.email, password: tempPassword },
      assignedRole
    );

    res.json({
      success: true,
      message: `Account approved! Credentials successfully emailed to ${request.email}.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      credentials: {
        email: request.email,
        password: tempPassword,
      },
      emailResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject account request
// @route   POST /api/users/account-requests/:id/reject
// @access  Private (Plan Event / Admin)
const rejectAccountRequest = async (req, res) => {
  try {
    const request = await AccountRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Account request not found' });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.adminNotes = req.body.adminNotes || 'Request declined by Plan Event organizer';
    await request.save();

    res.json({
      success: true,
      message: 'Account request has been rejected',
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create direct account or update existing credentials (Plan Event / Admin)
// @route   POST /api/users/create-account
// @access  Private (Plan Event / Admin)
const createDirectAccount = async (req, res) => {
  try {
    const { name, email, role, password, organization, updateIfExists } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const assignedRole = role || 'student';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';
    if (trimmedPassword && trimmedPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const tempPassword = trimmedPassword || `Pass#${Math.floor(100000 + Math.random() * 900000)}`;

    let user = await User.findOne({ email: cleanEmail });
    let wasUpdated = false;
    if (user) {
      if (!updateIfExists) {
        return res.status(400).json({
          code: 'USER_EXISTS',
          message: 'A user with this email already exists in MongoDB. Enable "Update existing account" or use Reset Password.',
        });
      }
      user.name = name.trim();
      user.password = tempPassword;
      user.role = assignedRole;
      user.organization = organization || user.organization || '';
      user.allocatedBy = req.user.id;
      user.allocatedRole = assignedRole;
      user.isVerified = true;
      await user.save();
      wasUpdated = true;
    } else {
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: tempPassword,
        role: assignedRole,
        organization: organization || '',
        allocatedBy: req.user.id,
        allocatedRole: assignedRole,
        isVerified: true,
      });
    }

    // Also record or update AccountRequest as approved
    await AccountRequest.findOneAndUpdate(
      { email: cleanEmail },
      {
        name: name.trim(),
        email: cleanEmail,
        requestedRole: assignedRole,
        organization: organization || '',
        purpose: wasUpdated ? 'Credentials updated by Plan Event organizer' : 'Directly provisioned by Plan Event organizer',
        status: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        generatedPassword: tempPassword,
        emailSent: true,
      },
      { upsert: true, new: true }
    );

    const emailResult = await sendAccountCredentialsEmail(
      cleanEmail,
      name,
      { email: cleanEmail, password: tempPassword },
      assignedRole
    );

    res.status(wasUpdated ? 200 : 201).json({
      success: true,
      updated: wasUpdated,
      message: wasUpdated
        ? `Updated credentials for ${cleanEmail}! User can sign in immediately.`
        : `Account created for ${name} and login ID & password emailed to ${cleanEmail}!`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      credentials: {
        email: cleanEmail,
        password: tempPassword,
      },
      emailResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset / Set password for an existing user (Plan Event / Admin)
// @route   PUT /api/users/:id/password
// @access  Private (Plan Event / Admin)
const resetUserPassword = async (req, res) => {
  try {
    const rawPassword = typeof req.body.password === 'string' ? req.body.password.trim() : '';
    if (rawPassword && rawPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only a master administrator can reset an admin password' });
    }

    const nextPassword = rawPassword || `Pass#${Math.floor(100000 + Math.random() * 900000)}`;
    user.password = nextPassword;
    user.allocatedBy = req.user.id;
    user.isVerified = true;
    await user.save();

    await AccountRequest.updateMany(
      { email: user.email },
      {
        status: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        generatedPassword: nextPassword,
      }
    );

    const emailResult = await sendAccountCredentialsEmail(
      user.email,
      user.name,
      { email: user.email, password: nextPassword },
      user.role
    );

    res.json({
      success: true,
      message: `Password updated for ${user.email}. Ready for immediate login.`,
      credentials: {
        email: user.email,
        password: nextPassword,
      },
      emailResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const normalizeNameForCheck = (value) =>
  String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

// @desc    Self-service password reset for registered / approved users
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPasswordReset = async (req, res) => {
  try {
    const { email, name, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = typeof newPassword === 'string' ? newPassword.trim() : '';

    if (!cleanEmail || !name?.trim() || !trimmedPassword) {
      return res.status(400).json({ message: 'Email, full name, and new password are required' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    if (cleanEmail.endsWith('@eventplanner.com')) {
      return res.status(403).json({
        message: 'Built-in demo and admin accounts cannot be changed via self-service.',
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        message: 'No account found with this email. Please create an account first.',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        message: 'Administrator accounts must be reset by another administrator.',
      });
    }

    if (normalizeNameForCheck(user.name) !== normalizeNameForCheck(name)) {
      return res.status(401).json({
        message: 'The full name provided does not match the registered name on this account.',
      });
    }

    user.password = trimmedPassword;
    user.isVerified = true;
    await user.save();

    await AccountRequest.updateMany(
      { email: cleanEmail },
      { status: 'approved', generatedPassword: '', adminNotes: 'Password set by user via Forgot Password' }
    );

    res.json({
      success: true,
      message: 'Password updated successfully! You can now sign in on mobile or desktop.',
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Demo Login for Visitors (Zero barrier visitor access)
// @route   POST /api/users/demo-login
// @access  Public
const demoLogin = async (req, res) => {
  try {
    const { role } = req.body;
    const targetRole = role === 'organizer' 
      ? 'organizer' 
      : (role === 'professional' || role === 'pro') 
        ? 'professional' 
        : 'student';

    const demoProfiles = {
      student: {
        name: 'Demo Student Visitor',
        email: 'demo.student@eventplanner.com',
        password: 'student123',
        role: 'student',
      },
      organizer: {
        name: 'Demo Plan Event Organizer',
        email: 'demo.planner@eventplanner.com',
        password: 'planner123',
        role: 'organizer',
      },
      professional: {
        name: 'Demo Pro Tools Specialist',
        email: 'demo.pro@eventplanner.com',
        password: 'pro123',
        role: 'professional',
      },
    };

    const profile = demoProfiles[targetRole] || demoProfiles.student;

    let user = await User.findOne({ email: profile.email });
    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        password: profile.password,
        role: profile.role,
        isVerified: true,
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
      isDemo: true,
      message: `Logged in as ${profile.name}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check MongoDB Live Status & Collection Counts
// @route   GET /api/users/mongo-status
// @access  Public
const getMongoStatus = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const requestCount = await AccountRequest.countDocuments();
    let eventCount = 0;
    try {
      const Event = (await import('../models/Event.js')).default;
      eventCount = await Event.countDocuments();
    } catch {}

    res.json({
      connected: true,
      database: 'event-planner',
      collections: {
        users: userCount,
        accountRequests: requestCount,
        events: eventCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ connected: false, message: error.message });
  }
};

// @desc    Import legacy MongoDB collections (Admin only, preserves password hashes)
// @route   POST /api/users/import-legacy
// @access  Private/Admin
const importLegacyData = async (req, res) => {
  try {
    const EJSON = mongoose.mongo.BSON.EJSON;
    const rawPayload = typeof req.body.ejson === 'string' ? EJSON.parse(req.body.ejson) : req.body;
    const {
      users = [],
      events = [],
      venuebookings = [],
      accountrequests = [],
      restorePasswordForEmails = [],
    } = rawPayload || {};

    const db = mongoose.connection.db;
    const usersCol = db.collection('users');
    const restoreSet = new Set(
      (restorePasswordForEmails || []).map((e) => String(e).trim().toLowerCase())
    );

    const idRemap = new Map();
    let usersInserted = 0;
    let usersPasswordRestored = 0;

    for (const u of users) {
      if (!u?.email) continue;
      const cleanEmail = String(u.email).trim().toLowerCase();
      const existing = await usersCol.findOne({ email: cleanEmail });
      if (existing) {
        if (u._id && existing._id && String(u._id) !== String(existing._id)) {
          idRemap.set(String(u._id), existing._id);
        }
        if (restoreSet.has(cleanEmail) && u.password) {
          await usersCol.updateOne(
            { _id: existing._id },
            { $set: { password: u.password } }
          );
          usersPasswordRestored += 1;
        }
      } else {
        await usersCol.insertOne({ ...u, email: cleanEmail });
        usersInserted += 1;
      }
    }

    const remapId = (val) => {
      if (!val) return val;
      const mapped = idRemap.get(String(val));
      return mapped || val;
    };

    let eventsInserted = 0;
    const eventsCol = db.collection('events');
    for (const ev of events) {
      if (!ev?._id) continue;
      const exists = await eventsCol.findOne({ _id: ev._id });
      if (!exists) {
        const doc = { ...ev };
        if (doc.organizer) doc.organizer = remapId(doc.organizer);
        if (doc.user) doc.user = remapId(doc.user);
        await eventsCol.insertOne(doc);
        eventsInserted += 1;
      }
    }

    let bookingsInserted = 0;
    const bookingsCol = db.collection('venuebookings');
    for (const vb of venuebookings) {
      if (!vb?._id) continue;
      const exists = await bookingsCol.findOne({ _id: vb._id });
      if (!exists) {
        const doc = { ...vb };
        if (doc.user) doc.user = remapId(doc.user);
        await bookingsCol.insertOne(doc);
        bookingsInserted += 1;
      }
    }

    let requestsInserted = 0;
    const reqsCol = db.collection('accountrequests');
    for (const ar of accountrequests) {
      if (!ar?.email) continue;
      const exists = await reqsCol.findOne({ email: String(ar.email).trim().toLowerCase() });
      if (!exists) {
        await reqsCol.insertOne({ ...ar, email: String(ar.email).trim().toLowerCase() });
        requestsInserted += 1;
      }
    }

    res.json({
      success: true,
      usersInserted,
      usersPasswordRestored,
      eventsInserted,
      bookingsInserted,
      requestsInserted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  allocateUserRole,
  deleteUser,
  requestAccount,
  getAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
  createDirectAccount,
  resetUserPassword,
  forgotPasswordReset,
  demoLogin,
  getMongoStatus,
  importLegacyData,
};

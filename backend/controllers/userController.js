import User from '../models/User.js';
import AccountRequest from '../models/AccountRequest.js';
import { sendAccountCredentialsEmail } from '../utils/mailer.js';
import jwt from 'jsonwebtoken';

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
      return res.status(400).json({ message: 'An account with this email already exists. Please sign in.' });
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

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.avatar = req.body.avatar || user.avatar;
      user.preferences = req.body.preferences || user.preferences;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        preferences: updatedUser.preferences,
        token: generateToken(updatedUser._id, updatedUser.role),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
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

// @desc    Create direct account & mail credentials (Plan Event / Admin)
// @route   POST /api/users/create-account
// @access  Private (Plan Event / Admin)
const createDirectAccount = async (req, res) => {
  try {
    const { name, email, role, password, organization } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const assignedRole = role || 'student';
    const tempPassword = password || `Pass#${Math.floor(100000 + Math.random() * 900000)}`;

    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      return res.status(400).json({ message: 'A user with this email already exists in MongoDB' });
    }

    user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: tempPassword,
      role: assignedRole,
      allocatedBy: req.user.id,
      allocatedRole: assignedRole,
      isVerified: true,
    });

    // Also record in AccountRequest as approved
    await AccountRequest.create({
      name: name.trim(),
      email: cleanEmail,
      requestedRole: assignedRole,
      organization: organization || '',
      purpose: 'Directly provisioned by Plan Event organizer',
      status: 'approved',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      generatedPassword: tempPassword,
      emailSent: true,
    });

    const emailResult = await sendAccountCredentialsEmail(
      cleanEmail,
      name,
      { email: cleanEmail, password: tempPassword },
      assignedRole
    );

    res.status(201).json({
      success: true,
      message: `Account created for ${name} and login ID & password emailed to ${cleanEmail}!`,
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
  demoLogin,
  getMongoStatus,
};

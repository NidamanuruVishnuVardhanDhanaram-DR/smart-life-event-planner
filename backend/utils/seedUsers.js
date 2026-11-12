import User from '../models/User.js';

const DEFAULT_SEED_USERS = [
  {
    name: 'Demo Student Visitor',
    email: 'student@eventplanner.com',
    password: 'password',
    role: 'student',
  },
  {
    name: 'Demo Plan Event Organizer',
    email: 'organizer@eventplanner.com',
    password: 'password',
    role: 'organizer',
  },
  {
    name: 'Demo Pro Tools Specialist',
    email: 'pro@eventplanner.com',
    password: 'password',
    role: 'professional',
  },
  {
    name: 'Master Administrator',
    email: 'admin@eventplanner.com',
    password: 'password',
    role: 'admin',
  },
  {
    name: 'Demo Visitor',
    email: 'demo@eventplanner.com',
    password: 'demo123',
    role: 'organizer',
  },
  {
    name: 'Demo Student Visitor',
    email: 'demo.student@eventplanner.com',
    password: 'student123',
    role: 'student',
  },
  {
    name: 'Demo Plan Event Organizer',
    email: 'demo.planner@eventplanner.com',
    password: 'planner123',
    role: 'organizer',
  },
  {
    name: 'Demo Pro Tools Specialist',
    email: 'demo.pro@eventplanner.com',
    password: 'pro123',
    role: 'professional',
  },
];

/**
 * Ensures all standard and demo accounts exist in MongoDB so login works
 * consistently across desktop, mobile, and offline-seed credentials.
 */
export const ensureSeedUsers = async () => {
  try {
    let createdCount = 0;
    for (const seed of DEFAULT_SEED_USERS) {
      const existing = await User.findOne({ email: seed.email });
      if (!existing) {
        await User.create({
          name: seed.name,
          email: seed.email,
          password: seed.password,
          role: seed.role,
          allocatedRole: seed.role,
        });
        createdCount += 1;
      }
    }
    if (createdCount > 0) {
      console.log(`✅ Seeded ${createdCount} default user account(s) to MongoDB`);
    }
  } catch (err) {
    console.error('Failed to seed default users:', err.message);
  }
};

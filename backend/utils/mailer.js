import nodemailer from 'nodemailer';

export const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Event Planner'}" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Email could not be sent');
  }
};

export const sendEventReminder = async (userEmail, userName, event) => {
  const subject = `Reminder: ${event.title} is coming up!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Event Reminder</h2>
      <p>Hi ${userName},</p>
      <p>This is a friendly reminder about your upcoming event:</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #007bff;">${event.title}</h3>
        <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${new Date(event.startDate).toLocaleTimeString()}</p>
        <p><strong>Location:</strong> ${event.location?.address || 'TBD'}</p>
        <p><strong>Description:</strong> ${event.description}</p>
      </div>

      <p>Don't forget to prepare everything for a successful event!</p>

      <div style="margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}"
           style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Event Details
        </a>
      </div>

      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        You're receiving this because you have event reminders enabled.
        <a href="#">Unsubscribe</a> if you no longer wish to receive these emails.
      </p>
    </div>
  `;

  await sendEmail({
    email: userEmail,
    subject,
    html,
  });
};

export const sendEventInvitation = async (userEmail, userName, event, inviterName) => {
  const subject = `You're invited to: ${event.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Event Invitation</h2>
      <p>Hi ${userName},</p>
      <p>${inviterName} has invited you to join an event:</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #007bff;">${event.title}</h3>
        <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${new Date(event.startDate).toLocaleTimeString()}</p>
        <p><strong>Location:</strong> ${event.location?.address || 'TBD'}</p>
        <p><strong>Description:</strong> ${event.description}</p>
      </div>

      <div style="margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}/rsvp"
           style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
          Accept Invitation
        </a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}"
           style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Details
        </a>
      </div>

      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This invitation was sent by ${inviterName}.
      </p>
    </div>
  `;

  await sendEmail({
    email: userEmail,
    subject,
    html,
  });
};

export const sendWelcomeEmail = async (userEmail, userName) => {
  const subject = 'Welcome to AI-Powered Smart Life Event Planner!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Event Planner!</h2>
      <p>Hi ${userName},</p>
      <p>Thank you for joining our AI-powered event planning platform. We're excited to help you create amazing events!</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">What you can do:</h3>
        <ul>
          <li>Plan events with AI assistance</li>
          <li>Get weather-aware planning suggestions</li>
          <li>Collaborate with team members</li>
          <li>Track budgets and resources</li>
          <li>Receive smart reminders</li>
        </ul>
      </div>

      <div style="margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard"
           style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Get Started
        </a>
      </div>

      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Need help? Contact our support team at support@eventplanner.com
      </p>
    </div>
  `;

  await sendEmail({
    email: userEmail,
    subject,
    html,
  });
};

export const sendAccountCredentialsEmail = async (userEmail, userName, credentials, role = 'student') => {
  const roleTitle = role === 'organizer' 
    ? '📋 Plan Event Account' 
    : role === 'professional' || role === 'pro' 
      ? '⭐ Pro Tools Account' 
      : '🎓 Student Account';

  const roleDescription = role === 'student'
    ? 'Your student account gives you access to the Event Calendar, Academic Analytics, and My Bookings passes.'
    : role === 'organizer'
      ? 'Your Plan Event account allows you to create events, book venues, allocate accounts, and manage participant allocations.'
      : 'Your Pro Tools account unlocks full enterprise access including the Pro AI Planning suite and automated generation tools.';

  const subject = `Your Account Credentials - Smart Life Event Planner (${roleTitle})`;
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #334155;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #60a5fa; margin: 0; font-size: 24px;">Smart Life Event Planner</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">Official Account Provisioning Notification</p>
      </div>

      <div style="background-color: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #475569; margin-bottom: 24px;">
        <h2 style="color: #f1f5f9; font-size: 18px; margin-top: 0;">Welcome, ${userName}!</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Your account request has been reviewed and approved by the <strong>Plan Event Manager</strong>. Your credentials have been generated below:
        </p>

        <div style="background-color: #0f172a; padding: 18px; border-radius: 10px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <p style="margin: 6px 0; color: #94a3b8; font-size: 13px;">ACCOUNT TIER</p>
          <p style="margin: 0 0 14px 0; color: #38bdf8; font-size: 16px; font-weight: bold;">${roleTitle}</p>

          <p style="margin: 6px 0; color: #94a3b8; font-size: 13px;">LOGIN ID / USERNAME</p>
          <p style="margin: 0 0 14px 0; color: #ffffff; font-size: 16px; font-weight: bold; font-family: monospace;">${credentials.email || userEmail}</p>

          <p style="margin: 6px 0; color: #94a3b8; font-size: 13px;">TEMPORARY PASSWORD</p>
          <p style="margin: 0; color: #34d399; font-size: 18px; font-weight: bold; font-family: monospace; letter-spacing: 1px;">${credentials.password}</p>
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          ${roleDescription}
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}"
           style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 15px;">
          Log In to Your Account
        </a>
      </div>

      <div style="border-top: 1px solid #334155; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px;">
        <p style="margin: 4px 0;">Security Reminder: Please change your temporary password after your first login.</p>
        <p style="margin: 4px 0;">Allocated by the Plan Event Organizer • Smart Life Event Planner</p>
      </div>
    </div>
  `;

  try {
    const isPlaceholder = !process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com';
    if (isPlaceholder) {
      console.log('\n======================================================');
      console.log('📨 [MAILER NOTIFICATION: CREDENTIALS DISPATCHED]');
      console.log(`To: ${userEmail} (${userName})`);
      console.log(`Role: ${roleTitle}`);
      console.log(`Login ID: ${credentials.email || userEmail}`);
      console.log(`Password: ${credentials.password}`);
      console.log(`Login URL: ${loginUrl}`);
      console.log('======================================================\n');
      return { success: true, delivered: false, simulated: true, credentials };
    }

    const info = await sendEmail({
      email: userEmail,
      subject,
      html,
    });

    console.log(`✅ Real email delivered to ${userEmail} via SMTP:`, info?.messageId);
    return { success: true, delivered: true, simulated: false, credentials };
  } catch (err) {
    console.warn(`⚠️ SMTP send failed (${err.message}). Logging simulated credentials to server:`);
    console.log('\n======================================================');
    console.log('📨 [MAILER BACKUP: CREDENTIALS READY FOR USER]');
    console.log(`To: ${userEmail} (${userName})`);
    console.log(`Role: ${roleTitle}`);
    console.log(`Login ID: ${credentials.email || userEmail}`);
    console.log(`Password: ${credentials.password}`);
    console.log('======================================================\n');
    return { success: true, delivered: false, simulated: true, error: err.message, credentials };
  }
};

export default {
  sendEmail,
  sendEventReminder,
  sendEventInvitation,
  sendWelcomeEmail,
  sendAccountCredentialsEmail,
};

const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getOTPExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

const sendOTPEmail = async (email, otp, userName) => {
  const transporter = createTransporter();

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #005eb8, #00b5e2); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">UTM Engage</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Email Verification</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px;">Hello ${userName},</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              Thank you for registering with UTM Engagement Platform. Please use the following verification code to complete your registration:
            </p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #005eb8; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #ef4444; font-size: 13px; margin: 16px 0; font-weight: 500;">
              This code will expire in 5 minutes.
            </p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              If you did not create an account with UTM Engage, please ignore this email.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              &copy; 2025 UTM Engagement Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'UTM Engage'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'UTM Engage - Email Verification Code',
    html: htmlTemplate,
    text: `Hello ${userName},\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not register, please ignore this email.\n\n- UTM Engage Team`
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const sendPasswordResetEmail = async (email, otp, userName) => {
  const transporter = createTransporter();

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #005eb8, #00b5e2); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">UTM Engage</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Password Reset</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px;">Hello ${userName},</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              We received a request to reset your password. Please use the following code to reset your password:
            </p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #005eb8; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #ef4444; font-size: 13px; margin: 16px 0; font-weight: 500;">
              This code will expire in 5 minutes.
            </p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              If you did not request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              &copy; 2025 UTM Engagement Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'UTM Engage'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'UTM Engage - Password Reset Code',
    html: htmlTemplate,
    text: `Hello ${userName},\n\nYour password reset code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\n- UTM Engage Team`
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const sendCommitteeRejectionEmail = async (email, userName, committeeName) => {
  const transporter = createTransporter();

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Committee Application Rejected</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #005eb8, #00b5e2); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">UTM Engage</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Committee Application Update</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px;">Hello ${userName},</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              We regret to inform you that your committee application has not been approved at this time.
            </p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Committee Name</p>
              <div style="font-size: 22px; font-weight: bold; color: #005eb8;">
                ${committeeName}
              </div>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 16px 0;">
              If you believe this was a mistake or would like more information, please contact the platform administrator. You are also welcome to revise and resubmit your committee application.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              &copy; 2025 UTM Engagement Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'UTM Engage'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'UTM Engage - Committee Application Rejected',
    html: htmlTemplate,
    text: `Hello ${userName},\n\nWe regret to inform you that your committee "${committeeName}" has not been approved.\n\nIf you believe this was a mistake or would like more information, please contact the platform administrator. You are also welcome to revise and resubmit your committee application.\n\n- UTM Engage Team`
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const sendCommitteeInvitationEmail = async (email, inviterName, committeeName, acceptUrl, declineUrl) => {
  const transporter = createTransporter();

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Committee Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #005eb8, #00b5e2); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">UTM Engage</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Committee Invitation</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px;">Hello,</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              You've been invited by <strong>${inviterName}</strong> to join the committee:
            </p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Committee Name</p>
              <div style="font-size: 22px; font-weight: bold; color: #005eb8;">
                ${committeeName}
              </div>
            </div>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${acceptUrl}" style="display: inline-block; padding: 12px 28px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">Accept Invitation</a>
              <a href="${declineUrl}" style="display: inline-block; padding: 12px 28px; background-color: #6b7280; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin-left: 12px;">Decline</a>
            </div>
            <p style="color: #ef4444; font-size: 13px; margin: 16px 0; font-weight: 500;">
              This invitation will expire in 7 days.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              &copy; 2025 UTM Engagement Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'UTM Engage'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'UTM Engage - Committee Invitation',
    html: htmlTemplate,
    text: `Hello,\n\nYou've been invited by ${inviterName} to join the committee: ${committeeName}.\n\nAccept: ${acceptUrl}\nDecline: ${declineUrl}\n\nThis invitation will expire in 7 days.\n\n- UTM Engage Team`
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const sendEventApprovedEmail = async (email, userName, eventTitle) => {
  const transporter = createTransporter();

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Approved</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #005eb8, #00b5e2); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">UTM Engage</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Event Approved</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px;">Hello ${userName},</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              Great news! Your event has been approved and is now visible to all students.
            </p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #16a34a;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Event Title</p>
              <div style="font-size: 22px; font-weight: bold; color: #005eb8;">
                ${eventTitle}
              </div>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 16px 0;">
              Students can now view and register for your event on UTM Engage.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              &copy; 2025 UTM Engagement Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'UTM Engage'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'UTM Engage - Event Approved',
    html: htmlTemplate,
    text: `Hello ${userName},\n\nGreat news! Your event "${eventTitle}" has been approved and is now visible to all students.\n\nStudents can now view and register for your event on UTM Engage.\n\n- UTM Engage Team`
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const sendEventRejectedEmail = async (email, userName, eventTitle) => {
  const transporter = createTransporter();

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Not Approved</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #005eb8, #00b5e2); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">UTM Engage</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Event Update</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px;">Hello ${userName},</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              We regret to inform you that your event was not approved.
            </p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #ef4444;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Event Title</p>
              <div style="font-size: 22px; font-weight: bold; color: #005eb8;">
                ${eventTitle}
              </div>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 16px 0;">
              If you believe this was in error, please contact the administration for more details. You may also modify and resubmit your event.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              &copy; 2025 UTM Engagement Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'UTM Engage'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'UTM Engage - Event Not Approved',
    html: htmlTemplate,
    text: `Hello ${userName},\n\nWe regret to inform you that your event "${eventTitle}" was not approved.\n\nIf you believe this was in error, please contact the administration for more details. You may also modify and resubmit your event.\n\n- UTM Engage Team`
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const sendMeetingScheduledEmail = async (email, userName, meetingDetails) => {
  const transporter = createTransporter();
  const { title, description, date, time, endTime, location, meetingType, meetingLink, committeeName, scheduledBy } = meetingDetails;

  const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeRange = endTime ? `${time} - ${endTime}` : time;

  const typeLabel = meetingType === 'in-person' ? 'In-Person' : meetingType === 'online' ? 'Online' : 'Hybrid';
  const typeColor = meetingType === 'in-person' ? '#16a34a' : meetingType === 'online' ? '#2563eb' : '#9333ea';
  const typeEmoji = meetingType === 'in-person' ? '📍' : meetingType === 'online' ? '💻' : '🔄';

  const locationRow = (meetingType === 'in-person' || meetingType === 'hybrid') && location
    ? `<tr><td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;width:120px;"><strong>Location</strong></td><td style="padding:8px 12px;color:#1e293b;font-size:14px;border-bottom:1px solid #e2e8f0;">📍 ${location}</td></tr>`
    : '';

  const meetingLinkRow = (meetingType === 'online' || meetingType === 'hybrid') && meetingLink
    ? `<tr><td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;width:120px;"><strong>Meeting Link</strong></td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;"><a href="${meetingLink}" style="color:#2563eb;text-decoration:none;font-size:14px;">🔗 Join Meeting</a></td></tr>`
    : '';

  const descriptionRow = description
    ? `<tr><td style="padding:8px 12px;color:#64748b;font-size:14px;width:120px;"><strong>Details</strong></td><td style="padding:8px 12px;color:#1e293b;font-size:14px;">${description}</td></tr>`
    : '';

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Scheduled</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #005eb8, #00b5e2); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">UTM Engage</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">New Meeting Scheduled</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px;">Hello ${userName},</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              A new meeting has been scheduled for <strong>${committeeName}</strong> by ${scheduledBy}.
            </p>
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid ${typeColor};">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 20px; margin-right: 8px;">${typeEmoji}</span>
                <span style="font-size: 20px; font-weight: bold; color: #1e293b;">${title}</span>
              </div>
              <span style="display: inline-block; background-color: ${typeColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">${typeLabel}</span>
              <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                <tr>
                  <td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;width:120px;"><strong>Date</strong></td>
                  <td style="padding:8px 12px;color:#1e293b;font-size:14px;border-bottom:1px solid #e2e8f0;">📅 ${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;width:120px;"><strong>Time</strong></td>
                  <td style="padding:8px 12px;color:#1e293b;font-size:14px;border-bottom:1px solid #e2e8f0;">🕐 ${timeRange}</td>
                </tr>
                ${locationRow}
                ${meetingLinkRow}
                ${descriptionRow}
              </table>
            </div>
            ${meetingLink ? `<div style="text-align: center; margin: 24px 0;"><a href="${meetingLink}" style="display: inline-block; padding: 12px 28px; background-color: ${typeColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">Join Meeting</a></div>` : ''}
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              Please make sure to attend on time. Open UTM Engage for more details.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              &copy; 2025 UTM Engagement Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const plainLocation = (meetingType === 'in-person' || meetingType === 'hybrid') && location ? `Location: ${location}\n` : '';
  const plainLink = (meetingType === 'online' || meetingType === 'hybrid') && meetingLink ? `Meeting Link: ${meetingLink}\n` : '';
  const plainDesc = description ? `Details: ${description}\n` : '';

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'UTM Engage'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: `UTM Engage - Meeting Scheduled: ${title}`,
    html: htmlTemplate,
    text: `Hello ${userName},\n\nA new meeting has been scheduled for ${committeeName} by ${scheduledBy}.\n\nTitle: ${title}\nType: ${typeLabel}\nDate: ${formattedDate}\nTime: ${timeRange}\n${plainLocation}${plainLink}${plainDesc}\nPlease make sure to attend on time.\n\n- UTM Engage Team`
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = {
  generateOTP,
  getOTPExpiry,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendCommitteeRejectionEmail,
  sendCommitteeInvitationEmail,
  sendEventApprovedEmail,
  sendEventRejectedEmail,
  sendMeetingScheduledEmail
};

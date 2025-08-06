const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailServiceEnhanced {
  constructor() {
    this.initializeEmailProvider();
    this.fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'noreply@gep.com';
    this.fromName = process.env.SMTP_FROM_NAME || process.env.SENDGRID_FROM_NAME || 'GEP Assignment System';
  }

  initializeEmailProvider() {
    // Priority: SMTP > SendGrid > Disabled
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Use SMTP
      this.provider = 'smtp';
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      this.enabled = true;
      logger.info('Email service initialized with SMTP');
    } else if (process.env.SENDGRID_API_KEY) {
      // Use SendGrid
      this.provider = 'sendgrid';
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.enabled = true;
      logger.info('Email service initialized with SendGrid');
    } else {
      // No email service configured
      this.provider = 'none';
      this.enabled = false;
      logger.warn('No email service configured. Emails will be logged only.');
    }
  }

  async sendEmail(options) {
    const { to, subject, text, html, templateData } = options;

    if (!this.enabled) {
      logger.info('Email (simulated):', {
        to,
        subject,
        templateData
      });
      return { success: true, simulated: true };
    }

    try {
      if (this.provider === 'smtp') {
        // Send via SMTP
        const mailOptions = {
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to,
          subject,
          text,
          html
        };

        const info = await this.transporter.sendMail(mailOptions);
        logger.info('Email sent via SMTP:', {
          messageId: info.messageId,
          to,
          subject
        });
        return { success: true, messageId: info.messageId };

      } else if (this.provider === 'sendgrid') {
        // Send via SendGrid
        const msg = {
          to,
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          subject,
          text,
          html
        };

        const response = await sgMail.send(msg);
        logger.info('Email sent via SendGrid:', {
          statusCode: response[0].statusCode,
          to,
          subject
        });
        return { success: true, statusCode: response[0].statusCode };
      }
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  // Copy all the existing methods from EmailService.js
  async sendAssignmentNotification(partner, request, assignment) {
    const subject = `New Assignment Opportunity - ${request.client_name}`;
    
    const emailData = {
      partner,
      request,
      assignment,
      acceptUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/assignments/${assignment.id}/accept`,
      declineUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/assignments/${assignment.id}/decline`,
      deadline: assignment.response_deadline
    };

    const htmlContent = this.generateAssignmentEmailTemplate(emailData);
    const textContent = this.generateAssignmentEmailText(emailData);

    return this.sendEmail({
      to: partner.email,
      subject,
      text: textContent,
      html: htmlContent,
      templateData: emailData
    });
  }

  generateAssignmentEmailTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; margin: 10px; text-decoration: none; border-radius: 5px; }
          .accept { background: #10b981; color: white; }
          .decline { background: #ef4444; color: white; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Assignment Opportunity</h1>
          </div>
          <div class="content">
            <p>Dear ${data.partner.name},</p>
            <p>You have been selected for a new assignment opportunity:</p>
            <ul>
              <li><strong>Client:</strong> ${data.request.client_name}</li>
              <li><strong>Location:</strong> ${data.request.location}</li>
              <li><strong>Service Date:</strong> ${new Date(data.request.requested_date).toLocaleDateString()}</li>
              <li><strong>Response Deadline:</strong> ${new Date(data.deadline).toLocaleString()}</li>
            </ul>
            <p>Please respond by the deadline above:</p>
            <div style="text-align: center;">
              <a href="${data.acceptUrl}" class="button accept">Accept Assignment</a>
              <a href="${data.declineUrl}" class="button decline">Decline Assignment</a>
            </div>
          </div>
          <div class="footer">
            <p>© 2024 GEP Assignment System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateAssignmentEmailText(data) {
    return `
New Assignment Opportunity

Dear ${data.partner.name},

You have been selected for a new assignment opportunity:

Client: ${data.request.client_name}
Location: ${data.request.location}
Service Date: ${new Date(data.request.requested_date).toLocaleDateString()}
Response Deadline: ${new Date(data.deadline).toLocaleString()}

Please respond by the deadline above:
Accept: ${data.acceptUrl}
Decline: ${data.declineUrl}

Best regards,
GEP Assignment System
    `;
  }

  // Add other email methods as needed
  async sendDeadlineReminder(partner, request, assignment) {
    const hoursRemaining = Math.ceil((new Date(assignment.response_deadline) - new Date()) / (1000 * 60 * 60));
    const subject = `Response Required - Assignment Deadline Approaching (${hoursRemaining}h remaining)`;
    
    const emailData = {
      partner,
      request,
      assignment,
      hoursRemaining,
      acceptUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/assignments/${assignment.id}/accept`,
      declineUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/assignments/${assignment.id}/decline`
    };

    const html = `
      <p>Dear ${partner.name},</p>
      <p>This is a reminder that you have ${hoursRemaining} hours remaining to respond to the assignment for ${request.client_name}.</p>
      <p>Please respond as soon as possible.</p>
    `;

    return this.sendEmail({
      to: partner.email,
      subject,
      text: `Reminder: ${hoursRemaining} hours remaining to respond to assignment for ${request.client_name}`,
      html,
      templateData: emailData
    });
  }

  async testConnection() {
    if (!this.enabled) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      if (this.provider === 'smtp') {
        await this.transporter.verify();
        return { success: true, message: 'SMTP connection successful' };
      } else if (this.provider === 'sendgrid') {
        // SendGrid doesn't have a verify method, so we'll just check if API key is set
        return { success: true, message: 'SendGrid configured' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailServiceEnhanced();
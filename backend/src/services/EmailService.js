const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.enabled = true;
    } else {
      logger.warn('SendGrid API key not found. Email notifications will be logged only.');
      this.enabled = false;
    }
    
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@gep.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'GEP Assignment System';
  }

  /**
   * Send assignment notification to partner
   */
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

  /**
   * Send deadline reminder to partner
   */
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

    const htmlContent = this.generateReminderEmailTemplate(emailData);
    const textContent = this.generateReminderEmailText(emailData);

    return this.sendEmail({
      to: partner.email,
      subject,
      text: textContent,
      html: htmlContent,
      templateData: emailData
    });
  }

  /**
   * Send assignment confirmation to client
   */
  async sendAssignmentConfirmation(clientEmail, partner, request, assignment) {
    const subject = `Assignment Confirmed - ${partner.name}`;
    
    const emailData = {
      partner,
      request,
      assignment
    };

    const htmlContent = this.generateConfirmationEmailTemplate(emailData);
    const textContent = this.generateConfirmationEmailText(emailData);

    return this.sendEmail({
      to: clientEmail,
      subject,
      text: textContent,
      html: htmlContent,
      templateData: emailData
    });
  }

  /**
   * Generic email sending method
   */
  async sendEmail({ to, subject, text, html, templateData = {} }) {
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

    try {
      if (this.enabled) {
        const response = await sgMail.send(msg);
        logger.info('Email sent successfully', {
          to,
          subject,
          messageId: response[0].headers['x-message-id']
        });
        return {
          success: true,
          messageId: response[0].headers['x-message-id']
        };
      } else {
        // Log email for development
        logger.info('Email would be sent (SendGrid disabled)', {
          to,
          subject,
          text: text.substring(0, 100) + '...'
        });
        return {
          success: true,
          messageId: 'dev_' + Date.now()
        };
      }
    } catch (error) {
      logger.error('Email send failed', {
        to,
        subject,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate assignment notification email template
   */
  generateAssignmentEmailTemplate(data) {
    const { partner, request, assignment, acceptUrl, declineUrl, deadline } = data;
    const totalCost = (assignment.assigned_hours * assignment.hourly_rate).toFixed(2);
    const deadlineFormatted = new Date(deadline).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Assignment Opportunity</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #007bff; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
        .assignment-details { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-row { margin-bottom: 10px; }
        .detail-label { font-weight: bold; color: #495057; }
        .detail-value { color: #212529; }
        .buttons { text-align: center; margin: 30px 0; }
        .button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 5px; font-weight: bold; text-transform: uppercase; }
        .accept-btn { background-color: #28a745; color: white; }
        .decline-btn { background-color: #dc3545; color: white; }
        .deadline { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">GEP Assignment System</div>
          <h2>New Assignment Opportunity</h2>
        </div>

        <p>Dear ${partner.name},</p>
        
        <p>We have a new assignment opportunity that matches your expertise. Please review the details below and respond within 24 hours.</p>

        <div class="assignment-details">
          <h3>Assignment Details</h3>
          <div class="detail-row">
            <span class="detail-label">Client:</span>
            <span class="detail-value">${request.client_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service Type:</span>
            <span class="detail-value">${request.service_type.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Location:</span>
            <span class="detail-value">${request.installation_address}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Estimated Hours:</span>
            <span class="detail-value">${assignment.assigned_hours}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Hourly Rate:</span>
            <span class="detail-value">€${assignment.hourly_rate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Total Estimated Cost:</span>
            <span class="detail-value"><strong>€${totalCost}</strong></span>
          </div>
          ${request.start_date ? `<div class="detail-row"><span class="detail-label">Start Date:</span><span class="detail-value">${request.start_date}</span></div>` : ''}
          ${request.end_date ? `<div class="detail-row"><span class="detail-label">End Date:</span><span class="detail-value">${request.end_date}</span></div>` : ''}
          ${request.special_requirements ? `<div class="detail-row"><span class="detail-label">Special Requirements:</span><span class="detail-value">${request.special_requirements}</span></div>` : ''}
        </div>

        <div class="deadline">
          <strong>Response Deadline:</strong> ${deadlineFormatted}
        </div>

        <div class="buttons">
          <a href="${acceptUrl}" class="button accept-btn">Accept Assignment</a>
          <a href="${declineUrl}" class="button decline-btn">Decline Assignment</a>
        </div>

        <p>If you have any questions about this assignment, please contact our team immediately.</p>

        <div class="footer">
          <p>This is an automated message from the GEP Assignment System.</p>
          <p>Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate text version of assignment email
   */
  generateAssignmentEmailText(data) {
    const { partner, request, assignment, acceptUrl, declineUrl, deadline } = data;
    const totalCost = (assignment.assigned_hours * assignment.hourly_rate).toFixed(2);
    const deadlineFormatted = new Date(deadline).toLocaleDateString('en-US');

    return `
Dear ${partner.name},

We have a new assignment opportunity that matches your expertise:

ASSIGNMENT DETAILS:
- Client: ${request.client_name}
- Service Type: ${request.service_type.replace('_', ' ').toUpperCase()}
- Location: ${request.installation_address}
- Estimated Hours: ${assignment.assigned_hours}
- Hourly Rate: €${assignment.hourly_rate}
- Total Estimated Cost: €${totalCost}
${request.start_date ? `- Start Date: ${request.start_date}` : ''}
${request.end_date ? `- End Date: ${request.end_date}` : ''}
${request.special_requirements ? `- Special Requirements: ${request.special_requirements}` : ''}

RESPONSE DEADLINE: ${deadlineFormatted}

Please respond within 24 hours:
- Accept: ${acceptUrl}
- Decline: ${declineUrl}

If you have any questions, please contact our team immediately.

Best regards,
GEP Assignment System

---
This is an automated message. Please do not reply directly to this email.
    `.trim();
  }

  /**
   * Generate reminder email template
   */
  generateReminderEmailTemplate(data) {
    const { partner, request, assignment, hoursRemaining, acceptUrl, declineUrl } = data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Response Required - Assignment Deadline Approaching</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .urgent { background-color: #fff3cd; border: 2px solid #ffc107; color: #856404; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
        .buttons { text-align: center; margin: 30px 0; }
        .button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .accept-btn { background-color: #28a745; color: white; }
        .decline-btn { background-color: #dc3545; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Response Required - Assignment Deadline Approaching</h2>
        
        <div class="urgent">
          <h3>⚠️ URGENT: ${hoursRemaining} Hours Remaining</h3>
          <p>Your response is required for the assignment opportunity from <strong>${request.client_name}</strong></p>
        </div>

        <p>Dear ${partner.name},</p>
        
        <p>This is a reminder that your response is required for the assignment opportunity. If we don't receive a response by the deadline, this assignment will be offered to another partner.</p>

        <div class="buttons">
          <a href="${acceptUrl}" class="button accept-btn">Accept Assignment</a>
          <a href="${declineUrl}" class="button decline-btn">Decline Assignment</a>
        </div>

        <p>Please respond as soon as possible to secure this assignment.</p>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate text version of reminder email
   */
  generateReminderEmailText(data) {
    const { partner, request, hoursRemaining, acceptUrl, declineUrl } = data;

    return `
URGENT: Response Required - ${hoursRemaining} Hours Remaining

Dear ${partner.name},

This is a reminder that your response is required for the assignment opportunity from ${request.client_name}.

If we don't receive a response by the deadline, this assignment will be offered to another partner.

Please respond as soon as possible:
- Accept: ${acceptUrl}
- Decline: ${declineUrl}

Best regards,
GEP Assignment System
    `.trim();
  }

  /**
   * Generate confirmation email template
   */
  generateConfirmationEmailTemplate(data) {
    const { partner, request, assignment } = data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Assignment Confirmed</title>
    </head>
    <body>
      <h2>Assignment Confirmed</h2>
      <p>Dear Client,</p>
      <p>We are pleased to confirm that <strong>${partner.name}</strong> has been assigned to your request.</p>
      
      <h3>Assignment Details:</h3>
      <ul>
        <li><strong>Partner:</strong> ${partner.name}</li>
        <li><strong>Service:</strong> ${request.service_type.replace('_', ' ').toUpperCase()}</li>
        <li><strong>Location:</strong> ${request.installation_address}</li>
        <li><strong>Hours:</strong> ${assignment.assigned_hours}</li>
      </ul>

      <p>The assigned partner will contact you directly to coordinate the schedule.</p>
      
      <p>Best regards,<br>GEP Assignment System</p>
    </body>
    </html>
    `;
  }

  /**
   * Generate text version of confirmation email
   */
  generateConfirmationEmailText(data) {
    const { partner, request, assignment } = data;

    return `
Assignment Confirmed

Dear Client,

We are pleased to confirm that ${partner.name} has been assigned to your request.

Assignment Details:
- Partner: ${partner.name}
- Service: ${request.service_type.replace('_', ' ').toUpperCase()}
- Location: ${request.installation_address}
- Hours: ${assignment.assigned_hours}

The assigned partner will contact you directly to coordinate the schedule.

Best regards,
GEP Assignment System
    `.trim();
  }
}

module.exports = EmailService;
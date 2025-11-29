const nodemailer = require("nodemailer");
const twilio = require("twilio");

const hasEmailConfig =
	process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const hasSmsConfig =
	process.env.TWILIO_ACCOUNT_SID &&
	process.env.TWILIO_AUTH_TOKEN &&
	process.env.TWILIO_PHONE_NUMBER;

if (!hasEmailConfig) {
	console.warn(
		"[Notification Service] Warning: SMTP configuration is missing. Emails will fail."
	);
}

if (!hasSmsConfig) {
	console.warn(
		"[Notification Service] Warning: Twilio configuration is missing. SMS will fail."
	);
}

// Email Transporter Initialization
const emailTransporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: process.env.SMTP_PORT || 587,
	secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

// Twilio Client Initialization
let twilioClient = null;
if (hasSmsConfig) {
	try {
		twilioClient = twilio(
			process.env.TWILIO_ACCOUNT_SID,
			process.env.TWILIO_AUTH_TOKEN
		);
	} catch (error) {
		console.error("[Notification Service] Failed to initialize Twilio client:", error.message);
	}
}

/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 */
async function sendEmail(to, subject, text, html = null) {
	if (!hasEmailConfig) {
		console.error("[Notification Service] Cannot send email: Missing SMTP config");
		return false;
	}

	try {
		const info = await emailTransporter.sendMail({
			from: process.env.SYSTEM_EMAIL_FROM || '"Smart Car Cloud" <no-reply@smartcars.ai>',
			to: to,
			subject: subject,
			text: text,
			html: html || text, // Fallback to text if HTML not provided
		});
		console.log(`[Notification Service] Email sent to ${to}. MessageId: ${info.messageId}`);
		return true;
	} catch (error) {
		console.error(`[Notification Service] Email failed to ${to}:`, error.message);
		return false;
	}
}

/**
 * Send an SMS notification via Twilio
 * @param {string} to - Recipient phone number
 * @param {string} body - SMS content
 */
async function sendSMS(to, body) {
	if (!twilioClient || !hasSmsConfig) {
		console.error("[Notification Service] Cannot send SMS: Missing Twilio config or client init failed");
		return false;
	}

	try {
		const message = await twilioClient.messages.create({
			body: body,
			from: process.env.TWILIO_PHONE_NUMBER,
			to: to,
		});
		console.log(`[Notification Service] SMS sent to ${to}. SID: ${message.sid}`);
		return true;
	} catch (error) {
		console.error(`[Notification Service] SMS failed to ${to}:`, error.message);
		return false;
	}
}

module.exports = {
	sendEmail,
	sendSMS,
};

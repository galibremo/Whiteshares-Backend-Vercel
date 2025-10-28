import ejs from "ejs";
import nodemailer from "nodemailer";
import path from "path";

const __dirname = process.cwd();

interface EmailService {
	email: string;
	emailSubject: string;
	template: string;
	data?: any;
	user?: string;
	password?: string;
	emailFrom?: string;
}

const sendEmail = async ({
	email,
	emailSubject,
	template,
	data,
	user = process.env.EMAIL_SERVER_USER,
	password = process.env.EMAIL_SERVER_PASSWORD,
	emailFrom = process.env.EMAIL_FROM
}: EmailService) => {
	// Configure your email transporter (replace placeholders with actual values)
	const transporter = nodemailer.createTransport({
		host: process.env.EMAIL_SERVER_HOST,
		port: Number(process.env.EMAIL_SERVER_PORT),
		auth: {
			user,
			pass: password
		},
		secure: false
	});

	// Verify connection configuration
	try {
		await transporter.verify();
		console.log("SMTP server connection verified successfully");
	} catch (error) {
		console.error("SMTP connection error:", error);
		// Instead of crashing, we'll continue but log the error
		// This way, the email might fail but the server will keep running
	}

	const html = await ejs.renderFile(
		path.join(__dirname, "src/templates", `${template}.ejs`),
		data,
		{
			async: true
		}
	);

	// Email content
	const mailOptions = {
		from: emailFrom,
		to: email,
		reply_to: emailFrom,
		subject: emailSubject,
		html
	};

	// Send the email
	try {
		const report = await transporter.sendMail(mailOptions);
		console.log("Email sent: %s", report.messageId);
		return Promise.resolve(report);
	} catch (error: any) {
		console.error("Email sending failed:", error);
		// Return a resolved promise with an error indicator instead of rejecting
		// This prevents the error from crashing the server
		return Promise.resolve({
			success: false,
			error: error.message || "Email sending failed"
		});
	}
};

export default sendEmail;

import nodemailer from "nodemailer";
import { type Item } from "../shared/schema";

// Create a transporter using environment variables
// For local testing, you can use a service like Ethereal or a real Gmail app password
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const NOTIFICATION_GROUP = process.env.NOTIFICATION_EMAIL || "lost-found-group@school.edu";

/**
 * Sends an email notification when a new item is reported.
 */
export async function sendItemNotification(item: Item) {
    const isLost = item.type === "lost";
    const subject = `New ${isLost ? "Lost" : "Found"} Item Reported: ${item.description}`;

    const html = `
    <h2>New Item Report</h2>
    <p><strong>Type:</strong> ${item.type.toUpperCase()}</p>
    <p><strong>Description:</strong> ${item.description}</p>
    <p><strong>Location:</strong> ${item.location}</p>
    <p><strong>Reported By:</strong> ${item.contactName} (${item.contactEmail})</p>
    <p><strong>Date reported:</strong> ${new Date(item.dateReported).toLocaleDateString()}</p>
    ${item.imageUrl ? `<p><strong>Image:</strong> <br/><img src="${process.env.BASE_URL || 'http://localhost:3000'}${item.imageUrl}" style="max-width: 300px;"/></p>` : ""}
    <hr/>
    <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin">View in Admin Dashboard</a></p>
  `;

    try {
        // Only attempt to send if we have at least user/pass configured, or it's the development ethereal default
        if (process.env.SMTP_USER || process.env.SMTP_HOST === "smtp.ethereal.email") {
            const info = await transporter.sendMail({
                from: '"Lost Box System" <noreply@school.edu>',
                to: NOTIFICATION_GROUP,
                subject,
                html,
            });

            console.log(`Notification email sent: ${info.messageId}`);

            // If using ethereal, log the URL to view the email
            if (process.env.SMTP_HOST === "smtp.ethereal.email") {
                console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
        } else {
            console.warn("SMTP_USER not configured, skipping email notification.");
        }
    } catch (error) {
        console.error("Failed to send email notification:", error);
    }
}

/**
 * Sends an email to the reporter about potential matches found in the system.
 */
export async function sendMatchNotification(item: Item, matches: Item[]) {
    const subject = `Potential Matches Found for your ${item.type} item: ${item.description}`;
    const html = `
    <h2>Good news! We found potential matches</h2>
    <p>You recently reported a <strong>${item.type}</strong> item: "${item.description}".</p>
    <p>Our system has identified ${matches.length} existing report(s) that might match yours:</p>
    <ul>
      ${matches.map(m => `
        <li>
          <strong>${m.description}</strong> (${m.location}) - 
          <a href="${process.env.BASE_URL || 'http://localhost:3000'}/?search=${encodeURIComponent(m.description)}">View Item</a>
        </li>
      `).join('')}
    </ul>
    <p>Please check the dashboard to see if any of these are a match!</p>
    <hr/>
    <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}">Visit Lost Box Dashboard</a></p>
  `;

    try {
        if (process.env.SMTP_USER || process.env.SMTP_HOST === "smtp.ethereal.email") {
            await transporter.sendMail({
                from: '"Lost Box System" <noreply@school.edu>',
                to: item.contactEmail,
                subject,
                html,
            });
            console.log(`Match notification sent to ${item.contactEmail}`);
        }
    } catch (error) {
        console.error("Failed to send match notification:", error);
    }
}

/**
 * Sends an alert to the admin group about items approaching the donation deadline.
 */
export async function sendExpiryAlert(expiredItems: Item[]) {
    if (expiredItems.length === 0) return;

    const subject = `ACTION REQUIRED: ${expiredItems.length} items reaching donation deadline`;
    const html = `
    <h2>Donation Deadline Alert</h2>
    <p>The following items have been in the "Found" box for over 30 days and are eligible for donation:</p>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th>ID</th>
          <th>Description</th>
          <th>Location</th>
          <th>Date Found</th>
        </tr>
      </thead>
      <tbody>
        ${expiredItems.map(i => `
          <tr>
            <td>${i.id}</td>
            <td>${i.description}</td>
            <td>${i.location}</td>
            <td>${new Date(i.dateReported).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin">Go to Admin Dashboard to process</a></p>
  `;

    try {
        if (process.env.SMTP_USER || process.env.SMTP_HOST === "smtp.ethereal.email") {
            await transporter.sendMail({
                from: '"Lost Box System Admin" <noreply@school.edu>',
                to: NOTIFICATION_GROUP,
                subject,
                html,
            });
            console.log("Expiry alert sent to admin group");
        }
    } catch (error) {
        console.error("Failed to send expiry alert:", error);
    }
}

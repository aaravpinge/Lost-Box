import nodemailer from "nodemailer";
import { type Item } from "../../shared/schema";

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
 * Sends notifications to all parties involved in a potential match.
 * If the new item is FOUND, it notifies all reporters of matching LOST items.
 * If the new item is LOST, it notifies the person who lost it about current found items.
 */
export async function sendMatchNotification(newItem: Item, matches: Item[]) {
    try {
        if (!process.env.SMTP_USER && process.env.SMTP_HOST !== "smtp.ethereal.email") {
            return;
        }

        // 1. Notify the person who just submitted the new report
        const reporterSubject = `Potential Matches Found for your ${newItem.type} item: ${newItem.description}`;
        const reporterHtml = `
            <h2>Match Found!</h2>
            <p>You recently reported a <strong>${newItem.type}</strong> item: "${newItem.description}".</p>
            <p>Our system has identified ${matches.length} matching report(s) in the system.</p>
            <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}">Visit the Dashboard to see your matches</a></p>
        `;

        await transporter.sendMail({
            from: '"Lost Box System" <noreply@school.edu>',
            to: newItem.contactEmail,
            subject: reporterSubject,
            html: reporterHtml,
        });

        // 2. IMPORTANT: If the new item is FOUND, notify everyone who LOST a matching item
        if (newItem.type === "found") {
            for (const lostItem of matches) {
                if (lostItem.type === "lost") {
                    const ownerSubject = `GOOD NEWS: A potential match for your lost ${lostItem.description} was just found!`;
                    const ownerHtml = `
                        <h2>We might have found your item!</h2>
                        <p>Someone just reported finding an item that matches your lost report: <strong>"${lostItem.description}"</strong>.</p>
                        <p><strong>Found Item Description:</strong> ${newItem.description}</p>
                        <p><strong>Found At:</strong> ${newItem.location}</p>
                        <hr/>
                        <p>Please visit the <a href="${process.env.BASE_URL || 'http://localhost:3000'}">Lost Box Dashboard</a> or the Front Office to claim it.</p>
                    `;

                    await transporter.sendMail({
                        from: '"Lost Box System" <noreply@school.edu>',
                        to: lostItem.contactEmail,
                        subject: ownerSubject,
                        html: ownerHtml,
                    });
                    console.log(`Notification sent to original lost reporter: ${lostItem.contactEmail}`);
                }
            }
        }
    } catch (error) {
        console.error("Failed to send match notifications:", error);
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

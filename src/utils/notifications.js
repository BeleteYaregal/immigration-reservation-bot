const notifyAdminNewReservation = async (telegram, adminChatId, reservation) => {
  if (!adminChatId) return;

  const msg = 
`🔔 *New Client Reservation Received!*

📋 *Queue Code:* \`${reservation.queueCode}\`
👤 *Full Name:* ${reservation.fullName}
📱 *Phone:* ${reservation.phoneNumber}
🛂 *Service:* ${reservation.serviceType}
📅 *Preferred Date:* ${reservation.preferredDate}
💬 *Telegram User:* ${reservation.username ? '@' + reservation.username : 'N/A'} (ID: \`${reservation.telegramId}\`)

_Use /next or /done ${reservation.queueCode} to manage._`;

  try {
    await telegram.sendMessage(adminChatId, msg, { parse_mode: 'Markdown' });
    if (reservation.documentFileId) {
      await telegram.sendPhoto(adminChatId, reservation.documentFileId, {
        caption: `📎 Document photo for \`${reservation.queueCode}\``,
        parse_mode: 'Markdown'
      });
    }
  } catch (err) {
    console.error('Failed to notify admin:', err.message);
  }
};

const notifyClientStatusUpdate = async (telegram, reservation, newStatus, adminNote = null) => {
  const statusEmoji = {
    PROCESSING: '⏳',
    COMPLETED: '✅',
    REJECTED: '❌',
    CANCELLED: '🚫',
  };

  const emoji = statusEmoji[newStatus] || 'ℹ️';

  let message = `${emoji} *Application Update*\n\n` +
    `Your reservation *${reservation.queue_code}* status has been updated to: *${newStatus}*\n\n` +
    `🛂 *Service:* ${reservation.service_type}\n` +
    `👤 *Applicant:* ${reservation.full_name}\n`;

  if (newStatus === 'PROCESSING') {
    message += `\nOur agent has picked up your request and is currently processing your reservation with the Immigration office.`;
  } else if (newStatus === 'COMPLETED') {
    message += `\n🎉 Great news! Your registration request has been successfully submitted! Our agent will reach out with the confirmation slip/appointment details.`;
  } else if (newStatus === 'REJECTED') {
    message += `\n⚠️ Unfortunately, this request could not be processed.`;
  }

  if (adminNote) {
    message += `\n\n📝 *Agent Note:* ${adminNote}`;
  }

  try {
    await telegram.sendMessage(reservation.telegram_id, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`Failed to send status update to ${reservation.telegram_id}:`, err.message);
  }
};

module.exports = {
  notifyAdminNewReservation,
  notifyClientStatusUpdate,
};

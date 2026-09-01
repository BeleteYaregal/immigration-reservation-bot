const { getReservationByCode, getReservationsByTelegramId } = require('../database/queries');

const statusCommand = async (ctx) => {
  const text = ctx.message ? ctx.message.text : '';
  const parts = text.trim().split(/\s+/);
  const queueCode = parts[1];

  if (queueCode) {
    const reservation = getReservationByCode(queueCode.toUpperCase());
    if (!reservation) {
      return ctx.reply(`❌ No reservation found with code: \`${queueCode}\``, { parse_mode: 'Markdown' });
    }

    const msg = 
`📋 *Reservation Status:* \`${reservation.queue_code}\`

👤 *Applicant:* ${reservation.full_name}
🛂 *Service:* ${reservation.service_type}
📱 *Phone:* ${reservation.phone_number}
📅 *Preferred Date:* ${reservation.preferred_date}
📊 *Current Status:* *${reservation.status}*
🕒 *Booked on:* ${reservation.created_at}
${reservation.admin_note ? `📝 *Note:* ${reservation.admin_note}` : ''}`;

    return ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  // If no code specified, fetch recent bookings for this user
  const userBookings = getReservationsByTelegramId(ctx.from.id);
  if (!userBookings || userBookings.length === 0) {
    return ctx.reply(
      'You have no active reservations.\n\nTo create one, type /reserve.',
      { parse_mode: 'Markdown' }
    );
  }

  const latest = userBookings[0];
  const msg = 
`📋 *Your Latest Reservation:* \`${latest.queue_code}\`

👤 *Applicant:* ${latest.full_name}
🛂 *Service:* ${latest.service_type}
📊 *Current Status:* *${latest.status}*
📅 *Preferred Date:* ${latest.preferred_date}
${latest.admin_note ? `📝 *Note:* ${latest.admin_note}\n` : ''}
_Tip: You can view any reservation by typing \`/status <queue-code>\` or view all with /mybookings._`;

  return ctx.reply(msg, { parse_mode: 'Markdown' });
};

const myBookingsCommand = async (ctx) => {
  const userBookings = getReservationsByTelegramId(ctx.from.id);
  if (!userBookings || userBookings.length === 0) {
    return ctx.reply('You have no reservations on file. Type /reserve to create one.');
  }

  let text = `📂 *Your Reservations (${userBookings.length}):*\n\n`;
  userBookings.forEach((b, idx) => {
    text += `${idx + 1}. \`${b.queue_code}\` — *${b.status}*\n   ${b.service_type} (${b.preferred_date})\n\n`;
  });

  return ctx.reply(text, { parse_mode: 'Markdown' });
};

module.exports = {
  statusCommand,
  myBookingsCommand,
};

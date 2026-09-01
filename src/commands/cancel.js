const { cancelReservation, getReservationsByTelegramId } = require('../database/queries');

const cancelBookingCommand = async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const queueCode = parts[1];

  if (!queueCode) {
    const userBookings = getReservationsByTelegramId(ctx.from.id);
    const pending = userBookings.filter(b => b.status === 'PENDING');

    if (pending.length === 0) {
      return ctx.reply('You do not have any pending reservations to cancel.');
    }

    let msg = 'To cancel a pending reservation, use `/cancel_booking <code-code>`:\n\n';
    pending.forEach(p => {
      msg += `• \`${p.queue_code}\` - ${p.service_type}\n`;
    });
    return ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  const success = cancelReservation(queueCode.toUpperCase(), ctx.from.id);
  if (success) {
    return ctx.reply(`✅ Reservation \`${queueCode.toUpperCase()}\` has been cancelled.`, { parse_mode: 'Markdown' });
  } else {
    return ctx.reply(`❌ Could not cancel reservation \`${queueCode}\`. Ensure the code is correct and still in PENDING status.`, { parse_mode: 'Markdown' });
  }
};

module.exports = cancelBookingCommand;

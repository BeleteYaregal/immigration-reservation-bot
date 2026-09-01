const { Markup } = require('telegraf');
const {
  getPendingReservations,
  getNextPending,
  updateStatus,
  getStats,
  getReservationByCode
} = require('../database/queries');
const { notifyClientStatusUpdate } = require('../utils/notifications');

const isAdmin = (ctx) => {
  const adminId = process.env.ADMIN_CHAT_ID;
  return adminId && ctx.from && ctx.from.id.toString() === adminId.toString();
};

const adminMiddleware = (handler) => async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('⛔ Unauthorized. This command is restricted to the bot administrator.');
  }
  return handler(ctx);
};

// /queue command
const queueCommand = adminMiddleware(async (ctx) => {
  const pending = getPendingReservations(15);
  if (pending.length === 0) {
    return ctx.reply('✅ No pending reservations in the queue!');
  }

  let text = `📋 *Pending Reservations (${pending.length}):*\n\n`;
  pending.forEach((r) => {
    text += `• \`${r.queue_code}\` | ${r.service_type}\n  👤 ${r.full_name} (📱 ${r.phone_number})\n  📅 Preferred: ${r.preferred_date}\n\n`;
  });
  text += `_Use /next to process the first in line, or /done <code/id>._`;

  return ctx.reply(text, { parse_mode: 'Markdown' });
});

// /next command
const nextCommand = adminMiddleware(async (ctx) => {
  const nextItem = getNextPending();
  if (!nextItem) {
    return ctx.reply('✅ No pending items in queue.');
  }

  const details = 
`🎯 *Next in Queue:* \`${nextItem.queue_code}\` (ID: ${nextItem.id})

👤 *Applicant:* ${nextItem.full_name}
📱 *Phone:* \`${nextItem.phone_number}\`
🛂 *Service:* ${nextItem.service_type}
📅 *Preferred Date:* ${nextItem.preferred_date}
💬 *Telegram:* ${nextItem.username ? '@' + nextItem.username : 'N/A'} (ID: \`${nextItem.telegram_id}\`)
🕒 *Received:* ${nextItem.created_at}

*Actions:*
/process ${nextItem.queue_code} — Start processing
/done ${nextItem.queue_code} [note] — Mark completed
/reject ${nextItem.queue_code} [reason] — Reject request`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('⏳ Start Processing', `ADMIN_PROC_${nextItem.id}`),
      Markup.button.callback('✅ Completed', `ADMIN_DONE_${nextItem.id}`),
    ],
    [
      Markup.button.callback('❌ Reject', `ADMIN_REJ_${nextItem.id}`)
    ]
  ]);

  await ctx.reply(details, { parse_mode: 'Markdown', ...keyboard });

  if (nextItem.document_file_id) {
    try {
      await ctx.replyWithPhoto(nextItem.document_file_id, {
        caption: `📎 Document photo for ${nextItem.queue_code}`
      });
    } catch (e) {
      console.error('Could not send photo:', e.message);
    }
  }
});

// /process <idOrCode>
const processCommand = adminMiddleware(async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const target = parts[1];
  if (!target) return ctx.reply('Usage: `/process <queue_code_or_id>`', { parse_mode: 'Markdown' });

  const updated = updateStatus(target, 'PROCESSING');
  if (!updated) return ctx.reply(`❌ Could not find reservation: ${target}`);

  await notifyClientStatusUpdate(ctx.telegram, updated, 'PROCESSING');
  return ctx.reply(`⏳ Status for \`${updated.queue_code}\` set to *PROCESSING*. Client notified!`, { parse_mode: 'Markdown' });
});

// /done <idOrCode> [note]
const doneCommand = adminMiddleware(async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const target = parts[1];
  const note = parts.slice(2).join(' ') || 'Application submitted successfully on immigration portal.';

  if (!target) return ctx.reply('Usage: `/done <queue_code_or_id> [optional note]`', { parse_mode: 'Markdown' });

  const updated = updateStatus(target, 'COMPLETED', note);
  if (!updated) return ctx.reply(`❌ Could not find reservation: ${target}`);

  await notifyClientStatusUpdate(ctx.telegram, updated, 'COMPLETED', note);
  return ctx.reply(`✅ Status for \`${updated.queue_code}\` set to *COMPLETED*. Client notified!`, { parse_mode: 'Markdown' });
});

// /reject <idOrCode> [reason]
const rejectCommand = adminMiddleware(async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const target = parts[1];
  const reason = parts.slice(2).join(' ') || 'Unable to fulfill reservation request.';

  if (!target) return ctx.reply('Usage: `/reject <queue_code_or_id> <reason>`', { parse_mode: 'Markdown' });

  const updated = updateStatus(target, 'REJECTED', reason);
  if (!updated) return ctx.reply(`❌ Could not find reservation: ${target}`);

  await notifyClientStatusUpdate(ctx.telegram, updated, 'REJECTED', reason);
  return ctx.reply(`❌ Status for \`${updated.queue_code}\` set to *REJECTED*. Client notified!`, { parse_mode: 'Markdown' });
});

// /stats
const statsCommand = adminMiddleware(async (ctx) => {
  const s = getStats();
  const text = 
`📊 *Reservation Service Statistics*

📦 *Total Reservations:* ${s.total}
⏳ *Pending in Queue:* ${s.pending}
⚙️ *Currently Processing:* ${s.processing}
✅ *Completed:* ${s.completed}
❌ *Rejected:* ${s.rejected}
🚫 *Cancelled by User:* ${s.cancelled}`;

  return ctx.reply(text, { parse_mode: 'Markdown' });
});

// Callback query handler for admin inline buttons
const handleAdminCallback = async (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Unauthorized', { show_alert: true });

  const data = ctx.callbackQuery.data;
  let status = null;
  let id = null;

  if (data.startsWith('ADMIN_PROC_')) {
    status = 'PROCESSING';
    id = parseInt(data.replace('ADMIN_PROC_', ''));
  } else if (data.startsWith('ADMIN_DONE_')) {
    status = 'COMPLETED';
    id = parseInt(data.replace('ADMIN_DONE_', ''));
  } else if (data.startsWith('ADMIN_REJ_')) {
    status = 'REJECTED';
    id = parseInt(data.replace('ADMIN_REJ_', ''));
  }

  if (status && id) {
    const updated = updateStatus(id, status);
    await ctx.answerCbQuery(`Updated to ${status}`);
    if (updated) {
      await notifyClientStatusUpdate(ctx.telegram, updated, status);
      await ctx.reply(`Reservation \`${updated.queue_code}\` marked as *${status}*. Client has been notified.`, { parse_mode: 'Markdown' });
    }
  }
};

module.exports = {
  isAdmin,
  queueCommand,
  nextCommand,
  processCommand,
  doneCommand,
  rejectCommand,
  statsCommand,
  handleAdminCallback,
};

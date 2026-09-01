require('dotenv').config();
const http = require('http');
const { Telegraf, Scenes, session } = require('telegraf');

const reserveWizard = require('./scenes/reserveScene');
const startCommand = require('./commands/start');
const { statusCommand, myBookingsCommand } = require('./commands/status');
const cancelBookingCommand = require('./commands/cancel');
const {
  queueCommand,
  nextCommand,
  processCommand,
  doneCommand,
  rejectCommand,
  statsCommand,
  handleAdminCallback,
  isAdmin
} = require('./commands/admin');

// Lightweight HTTP server for Render / Cloud hosting health checks
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Ethiopian Immigration Bot', uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`📡 Health-check HTTP server listening on port ${PORT}`);
});

const token = process.env.BOT_TOKEN;
if (!token || token === 'your_bot_token_here') {
  console.error('❌ ERROR: BOT_TOKEN is missing or not set in .env');
  console.error('Please configure your .env file with your Telegram bot token from @BotFather.');
  // Keep HTTP server alive so deployment does not immediately crash loop if user sets env vars later in Render dashboard
  console.log('Bot is waiting for a valid BOT_TOKEN...');
} else {
  startBot(token);
}

function startBot(botToken) {
  const bot = new Telegraf(botToken);

  // Set up Stage & Scenes
  const stage = new Scenes.Stage([reserveWizard]);
  bot.use(session());
  bot.use(stage.middleware());

  // Public / Client Commands
  bot.start(startCommand);

  bot.command('reserve', (ctx) => ctx.scene.enter('RESERVE_SCENE'));
  bot.action('START_RESERVATION', (ctx) => {
    ctx.answerCbQuery();
    return ctx.scene.enter('RESERVE_SCENE');
  });

  bot.command('status', statusCommand);
  bot.action('CHECK_STATUS_PROMPT', (ctx) => {
    ctx.answerCbQuery();
    return statusCommand(ctx);
  });

  bot.command('mybookings', myBookingsCommand);
  bot.command('cancel_booking', cancelBookingCommand);

  bot.help((ctx) => {
    const isUserAdmin = isAdmin(ctx);
    let helpMsg = 
`ℹ️ *Immigration Assistance Bot Help*

👤 *Client Commands:*
/reserve - Start a new reservation request
/status [queue_code] - Check the status of your reservation
/mybookings - View all your booked requests
/cancel_booking [queue_code] - Cancel a pending request
/help - Show this guide

📞 *Official Ethiopian Immigration Portal:*
Website: https://www.immigration.gov.et
Free hotline: 8133`;

    if (isUserAdmin) {
      helpMsg += 
`\n\n🛡️ *Admin Commands:*
/queue - View pending reservations
/next - View and manage the next reservation in line
/process <code/id> - Mark as PROCESSING
/done <code/id> [note] - Mark as COMPLETED & notify user
/reject <code/id> [reason] - Mark as REJECTED & notify user
/stats - View queue statistics`;
    }

    return ctx.reply(helpMsg, { parse_mode: 'Markdown' });
  });

  // Admin Commands
  bot.command('queue', queueCommand);
  bot.command('next', nextCommand);
  bot.command('process', processCommand);
  bot.command('done', doneCommand);
  bot.command('reject', rejectCommand);
  bot.command('stats', statsCommand);

  // Action handler for admin buttons
  bot.action(/ADMIN_(PROC|DONE|REJ)_\d+/, handleAdminCallback);

  // Global error handler
  bot.catch((err, ctx) => {
    console.error(`Error encountered for ${ctx.updateType}:`, err);
    ctx.reply('⚠️ An unexpected error occurred. Please try again later.').catch(() => {});
  });

  // Launch bot
  bot.launch()
    .then(() => {
      console.log('==============================================');
      console.log('🚀 Ethiopian Immigration Bot is online & running!');
      console.log(`👨‍💼 Admin Chat ID: ${process.env.ADMIN_CHAT_ID || 'Not configured'}`);
      console.log('==============================================');
    })
    .catch((err) => {
      console.error('Failed to launch bot:', err);
    });

  // Enable graceful stop
  process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
  });
}

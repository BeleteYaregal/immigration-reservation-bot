const { Markup } = require('telegraf');

const startCommand = async (ctx) => {
  const firstName = ctx.from.first_name || 'there';
  const welcomeText = 
`👋 *Hello, ${firstName}!*

Welcome to the *Ethiopian Immigration Assistance Service Bot*.

We assist clients in booking and preparing registrations for:
• 📘 New Ethiopian ePassport
• 🔄 Passport Renewal / Replacement
• 🇪🇹 Ethiopian Origin ID (Yellow Card)
• ✈️ Visas & Work/Residence Permits

🚀 *Available Commands:*
/reserve - Start a new reservation request
/status - Check the status of your reservation
/mybookings - View all your booked reservations
/help - Get assistance and contact info

To begin, click the button below or type /reserve!`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📝 Start Reservation', 'START_RESERVATION')],
    [Markup.button.callback('🔍 Check Status', 'CHECK_STATUS_PROMPT')]
  ]);

  await ctx.reply(welcomeText, { parse_mode: 'Markdown', ...keyboard });
};

module.exports = startCommand;

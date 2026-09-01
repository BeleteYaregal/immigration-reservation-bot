const { Scenes, Markup } = require('telegraf');
const { createReservation } = require('../database/queries');
const { generateQueueCode, isValidPhone, formatPhone } = require('../utils/validators');
const { notifyAdminNewReservation } = require('../utils/notifications');

const SERVICE_OPTIONS = [
  '📘 New Passport',
  '🔄 Passport Renewal',
  '🇪🇹 Ethiopian Origin ID (Yellow Card)',
  '✈️ Visa Application',
  '🏢 Residence / Work Permit'
];

const reserveWizard = new Scenes.WizardScene(
  'RESERVE_SCENE',
  // Step 1: Choose Service
  async (ctx) => {
    ctx.wizard.state.reservation = {};
    const keyboard = Markup.inlineKeyboard(
      SERVICE_OPTIONS.map((srv) => [Markup.button.callback(srv, `SRV_${srv}`)])
    );

    await ctx.reply(
      '🛂 *Ethiopian Immigration Reservation*\n\nPlease select the service you need assistance with:',
      { parse_mode: 'Markdown', ...keyboard }
    );
    return ctx.wizard.next();
  },

  // Step 2: Handle Service selection & ask Full Name
  async (ctx) => {
    if (!ctx.callbackQuery || !ctx.callbackQuery.data.startsWith('SRV_')) {
      await ctx.reply('Please select an option using the buttons above, or type /cancel to stop.');
      return;
    }

    const selectedService = ctx.callbackQuery.data.replace('SRV_', '');
    ctx.wizard.state.reservation.serviceType = selectedService;
    await ctx.answerCbQuery();
    await ctx.reply(
      `Selected: *${selectedService}*\n\nPlease type your *Full Legal Name* (as shown on your national ID/passport):`,
      { parse_mode: 'Markdown' }
    );
    return ctx.wizard.next();
  },

  // Step 3: Handle Full Name & ask Phone Number
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Please provide your name as text, or type /cancel to stop.');
      return;
    }

    const fullName = ctx.message.text.trim();
    if (fullName.length < 3) {
      await ctx.reply('Please enter a valid full name (at least 3 characters):');
      return;
    }

    ctx.wizard.state.reservation.fullName = fullName;
    await ctx.reply(
      `Thank you, *${fullName}*.\n\nPlease enter your *Phone Number* (e.g., \`+251911223344\` or \`0911223344\`):`,
      { parse_mode: 'Markdown' }
    );
    return ctx.wizard.next();
  },

  // Step 4: Handle Phone Number & ask Preferred Date
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Please provide your phone number as text.');
      return;
    }

    const phoneInput = ctx.message.text.trim();
    if (!isValidPhone(phoneInput)) {
      await ctx.reply('⚠️ Invalid phone number format. Please provide an Ethiopian number like `0911223344` or `+251911223344`:');
      return;
    }

    ctx.wizard.state.reservation.phoneNumber = formatPhone(phoneInput);
    await ctx.reply(
      '📅 What is your *preferred appointment date or time frame*?\n(e.g., `2026-09-15` or `Next Monday morning`):',
      { parse_mode: 'Markdown' }
    );
    return ctx.wizard.next();
  },

  // Step 5: Handle Preferred Date & ask Document photo
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Please enter a preferred date or timeframe.');
      return;
    }

    ctx.wizard.state.reservation.preferredDate = ctx.message.text.trim();

    const skipKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('⏭️ Skip photo for now', 'SKIP_PHOTO')]
    ]);

    await ctx.reply(
      '📷 *Optional: Attach National ID or Passport Photo*\n\nYou can send a photo of your ID/document now to speed up your registration, or click Skip:',
      { parse_mode: 'Markdown', ...skipKeyboard }
    );
    return ctx.wizard.next();
  },

  // Step 6: Handle Document Photo & Confirmation
  async (ctx) => {
    let documentFileId = null;

    if (ctx.callbackQuery && ctx.callbackQuery.data === 'SKIP_PHOTO') {
      await ctx.answerCbQuery();
    } else if (ctx.message && ctx.message.photo && ctx.message.photo.length > 0) {
      const highestResPhoto = ctx.message.photo[ctx.message.photo.length - 1];
      documentFileId = highestResPhoto.file_id;
    } else if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Please send a photo or click "Skip photo for now".');
      return;
    }

    ctx.wizard.state.reservation.documentFileId = documentFileId;
    const res = ctx.wizard.state.reservation;

    const summary = 
`📋 *Review your reservation details:*

🛂 *Service:* ${res.serviceType}
👤 *Full Name:* ${res.fullName}
📱 *Phone:* ${res.phoneNumber}
📅 *Preferred Date:* ${res.preferredDate}
📎 *Document:* ${res.documentFileId ? 'Attached ✅' : 'None provided'}

Would you like to confirm and submit this reservation?`;

    const confirmKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Confirm & Submit', 'CONFIRM_RESERVATION'),
        Markup.button.callback('❌ Cancel', 'CANCEL_RESERVATION')
      ]
    ]);

    await ctx.reply(summary, { parse_mode: 'Markdown', ...confirmKeyboard });
    return ctx.wizard.next();
  },

  // Step 7: Finalize submission
  async (ctx) => {
    if (!ctx.callbackQuery) {
      await ctx.reply('Please click Confirm or Cancel.');
      return;
    }

    const action = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (action === 'CANCEL_RESERVATION') {
      await ctx.reply('❌ Reservation cancelled. You can type /reserve whenever you are ready.');
      return ctx.scene.leave();
    }

    if (action === 'CONFIRM_RESERVATION') {
      const state = ctx.wizard.state.reservation;
      const queueCode = generateQueueCode();

      const reservationData = {
        queueCode,
        telegramId: ctx.from.id,
        username: ctx.from.username || null,
        serviceType: state.serviceType,
        fullName: state.fullName,
        phoneNumber: state.phoneNumber,
        preferredDate: state.preferredDate,
        documentFileId: state.documentFileId,
      };

      try {
        createReservation(reservationData);

        const successMsg = 
`🎉 *Reservation Successfully Booked!*

Your Queue Code is: \`${queueCode}\`

📌 *What happens next?*
1. Our human assistance agent will take your details and prepare your application for submission on the Ethiopian Immigration & Citizenship portal.
2. You will receive real-time updates directly in this chat when your status changes.
3. You can check your status anytime by sending \`/status ${queueCode}\`.

Thank you for choosing our service!`;

        await ctx.reply(successMsg, { parse_mode: 'Markdown' });

        // Notify admin
        const adminChatId = process.env.ADMIN_CHAT_ID;
        await notifyAdminNewReservation(ctx.telegram, adminChatId, reservationData);

      } catch (err) {
        console.error('Error saving reservation:', err);
        await ctx.reply('⚠️ Something went wrong while saving your reservation. Please try again with /reserve.');
      }

      return ctx.scene.leave();
    }
  }
);

// Allow user to cancel at any step via /cancel
reserveWizard.command('cancel', async (ctx) => {
  await ctx.reply('❌ Reservation flow cancelled.');
  return ctx.scene.leave();
});

module.exports = reserveWizard;

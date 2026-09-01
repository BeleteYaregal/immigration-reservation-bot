# 🇪🇹 Ethiopian Immigration Assistance Telegram Bot

A Telegram bot for immigration consultancy and assistance services. It provides a guided reservation wizard for your clients, a persistent SQLite queue, and an admin management interface so you can process client registrations on the official portal (`immigration.gov.et`).

---

## 🌟 Key Features

### For Clients
- **`/start`**: Interactive welcome with quick-action buttons.
- **`/reserve`**: Step-by-step wizard collecting:
  1. Service type (New Passport, Passport Renewal, Origin ID, Visa, Residence Permit)
  2. Full legal name
  3. Phone number (Ethiopian format validated)
  4. Preferred appointment date/timeframe
  5. Optional ID/Document photo upload
  6. Final review and confirmation
- **`/status [queue_code]`**: Check current status of application.
- **`/mybookings`**: View all requests submitted from their Telegram account.
- **`/cancel_booking [queue_code]`**: Cancel a pending request.
- **Automatic Status Alerts**: Clients automatically receive notifications in Telegram when you update their status (`PROCESSING`, `COMPLETED`, `REJECTED`).

### For You (Admin)
- **Instant Alerts**: Notifies your private Telegram chat whenever a client submits a reservation (including document photo).
- **`/queue`**: View all pending client requests.
- **`/next`**: Inspect the next reservation in line with interactive one-click action buttons (`Start Processing`, `Completed`, `Reject`).
- **`/process <code/id>`**: Mark request as in-progress.
- **`/done <code/id> [optional note]`**: Mark completed (triggers client celebration notification).
- **`/reject <code/id> [reason]`**: Reject request with an explanatory note to the client.
- **`/stats`**: View total, pending, processing, and completed counts.

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- **Node.js** (v18 or newer recommended). Verify by running:
  ```bash
  node -v
  npm -v
  ```

### 2. Install Dependencies
Run the following in the project folder:
```bash
npm install
```

### 3. Get Your Telegram Bot Token
1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to name your bot and choose a username (e.g., `EthioImmigrationAssistBot`).
3. BotFather will provide an API token like: `1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ`.

### 4. Get Your Telegram Admin ID
1. Search for [@userinfobot](https://t.me/userinfobot) on Telegram.
2. Click **Start**. It will reply with your numerical ID (e.g., `987654321`).

### 5. Configure `.env`
Open the `.env` file in the project folder and insert your credentials:
```env
BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
ADMIN_CHAT_ID=987654321
BOT_USERNAME=EthioImmigrationAssistBot
```

### 6. Run the Bot
- **Production mode:**
  ```bash
  npm start
  ```
- **Development mode (auto-reloads on file change):**
  ```bash
  npm run dev
  ```

---

## 📁 Project Architecture

```
├── data/
│   └── reservations.db       # SQLite database (auto-created on first run)
├── src/
│   ├── bot.js                # Main Telegraf app & bot registration
│   ├── scenes/
│   │   └── reserveScene.js   # Guided client booking wizard
│   ├── commands/
│   │   ├── start.js          # /start command & welcome menu
│   │   ├── status.js         # /status and /mybookings commands
│   │   ├── cancel.js         # /cancel_booking command
│   │   └── admin.js          # /queue, /next, /done, /reject, /stats
│   ├── database/
│   │   ├── db.js             # SQLite connection & table schemas
│   │   └── queries.js        # CRUD operations for reservations
│   └── utils/
│       ├── notifications.js  # Automated Telegram client & admin alerts
│       └── validators.js     # Phone number & queue code generators
├── .env                      # Secrets & tokens (keep private!)
├── package.json
└── README.md
```

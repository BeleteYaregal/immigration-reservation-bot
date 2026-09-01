const db = require('./db');

const createReservation = ({
  queueCode,
  telegramId,
  username,
  serviceType,
  fullName,
  phoneNumber,
  preferredDate,
  documentFileId = null,
}) => {
  const stmt = db.prepare(`
    INSERT INTO reservations (
      queue_code, telegram_id, username, service_type, full_name,
      phone_number, preferred_date, document_file_id, status
    ) VALUES (
      @queueCode, @telegramId, @username, @serviceType, @fullName,
      @phoneNumber, @preferredDate, @documentFileId, 'PENDING'
    )
  `);

  const result = stmt.run({
    queueCode,
    telegramId,
    username,
    serviceType,
    fullName,
    phoneNumber,
    preferredDate,
    documentFileId,
  });

  return { id: result.lastInsertRowid, queueCode };
};

const getReservationByCode = (queueCode) => {
  const stmt = db.prepare('SELECT * FROM reservations WHERE queue_code = ?');
  return stmt.get(queueCode);
};

const getReservationsByTelegramId = (telegramId) => {
  const stmt = db.prepare('SELECT * FROM reservations WHERE telegram_id = ? ORDER BY created_at DESC');
  return stmt.all(telegramId);
};

const getPendingReservations = (limit = 20) => {
  const stmt = db.prepare(`
    SELECT * FROM reservations 
    WHERE status = 'PENDING' 
    ORDER BY id ASC 
    LIMIT ?
  `);
  return stmt.all(limit);
};

const getNextPending = () => {
  const stmt = db.prepare(`
    SELECT * FROM reservations 
    WHERE status = 'PENDING' 
    ORDER BY id ASC 
    LIMIT 1
  `);
  return stmt.get();
};

const updateStatus = (idOrCode, status, adminNote = null) => {
  const isCode = typeof idOrCode === 'string' && idOrCode.startsWith('ICS-');
  const sql = isCode
    ? `UPDATE reservations SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE queue_code = ?`
    : `UPDATE reservations SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

  const stmt = db.prepare(sql);
  const info = stmt.run(status, adminNote, idOrCode);
  
  if (info.changes > 0) {
    const fetchSql = isCode
      ? 'SELECT * FROM reservations WHERE queue_code = ?'
      : 'SELECT * FROM reservations WHERE id = ?';
    return db.prepare(fetchSql).get(idOrCode);
  }
  return null;
};

const cancelReservation = (queueCode, telegramId) => {
  const stmt = db.prepare(`
    UPDATE reservations 
    SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
    WHERE queue_code = ? AND telegram_id = ? AND status = 'PENDING'
  `);
  const info = stmt.run(queueCode, telegramId);
  return info.changes > 0;
};

const getStats = () => {
  const total = db.prepare('SELECT COUNT(*) as count FROM reservations').get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'PENDING'").get().count;
  const processing = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'PROCESSING'").get().count;
  const completed = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'COMPLETED'").get().count;
  const rejected = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'REJECTED'").get().count;
  const cancelled = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'CANCELLED'").get().count;

  return { total, pending, processing, completed, rejected, cancelled };
};

module.exports = {
  createReservation,
  getReservationByCode,
  getReservationsByTelegramId,
  getPendingReservations,
  getNextPending,
  updateStatus,
  cancelReservation,
  getStats,
};

const { loadData, saveData } = require('./db');

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
  const data = loadData();
  const now = new Date().toISOString();

  const newReservation = {
    id: data.nextId++,
    queue_code: queueCode,
    telegram_id: telegramId,
    username: username || null,
    service_type: serviceType,
    full_name: fullName,
    phone_number: phoneNumber,
    preferred_date: preferredDate,
    document_file_id: documentFileId,
    status: 'PENDING',
    admin_note: null,
    created_at: now,
    updated_at: now,
  };

  data.reservations.push(newReservation);
  saveData(data);

  return { id: newReservation.id, queueCode };
};

const getReservationByCode = (queueCode) => {
  const data = loadData();
  return data.reservations.find(
    (r) => r.queue_code.toUpperCase() === queueCode.toUpperCase()
  ) || null;
};

const getReservationsByTelegramId = (telegramId) => {
  const data = loadData();
  return data.reservations
    .filter((r) => r.telegram_id === telegramId)
    .sort((a, b) => b.id - a.id);
};

const getPendingReservations = (limit = 20) => {
  const data = loadData();
  return data.reservations
    .filter((r) => r.status === 'PENDING')
    .sort((a, b) => a.id - b.id)
    .slice(0, limit);
};

const getNextPending = () => {
  const data = loadData();
  return data.reservations.find((r) => r.status === 'PENDING') || null;
};

const updateStatus = (idOrCode, status, adminNote = null) => {
  const data = loadData();
  const isCode = typeof idOrCode === 'string' && idOrCode.startsWith('ICS-');
  
  const reservation = data.reservations.find((r) => {
    if (isCode) {
      return r.queue_code.toUpperCase() === idOrCode.toUpperCase();
    }
    return r.id === parseInt(idOrCode, 10);
  });

  if (!reservation) return null;

  reservation.status = status;
  if (adminNote !== null) {
    reservation.admin_note = adminNote;
  }
  reservation.updated_at = new Date().toISOString();

  saveData(data);
  return reservation;
};

const cancelReservation = (queueCode, telegramId) => {
  const data = loadData();
  const reservation = data.reservations.find(
    (r) => r.queue_code.toUpperCase() === queueCode.toUpperCase() &&
           r.telegram_id === telegramId &&
           r.status === 'PENDING'
  );

  if (!reservation) return false;

  reservation.status = 'CANCELLED';
  reservation.updated_at = new Date().toISOString();
  saveData(data);
  return true;
};

const getStats = () => {
  const data = loadData();
  const list = data.reservations;

  return {
    total: list.length,
    pending: list.filter((r) => r.status === 'PENDING').length,
    processing: list.filter((r) => r.status === 'PROCESSING').length,
    completed: list.filter((r) => r.status === 'COMPLETED').length,
    rejected: list.filter((r) => r.status === 'REJECTED').length,
    cancelled: list.filter((r) => r.status === 'CANCELLED').length,
  };
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

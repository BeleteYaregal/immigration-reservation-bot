const generateQueueCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `ICS-${timestamp}-${randomSuffix}`;
};

const isValidPhone = (phone) => {
  // Accepts Ethiopian formats: +2519..., 09..., 07..., 2519...
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const ethiopianRegex = /^(\+?251|0)?[79]\d{8}$/;
  return ethiopianRegex.test(cleaned);
};

const formatPhone = (phone) => {
  return phone.replace(/[\s\-()]/g, '');
};

module.exports = {
  generateQueueCode,
  isValidPhone,
  formatPhone,
};

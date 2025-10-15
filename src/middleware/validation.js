"use strict";

function validateCityName(city) {
  if (!city || typeof city !== "string") {
    return { valid: false, error: "Invalid city name" };
  }

  const trimmed = city.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Invalid city name" };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: "Invalid city name" };
  }

  const validPattern =
    /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s'-]+$/;

  if (!validPattern.test(trimmed)) {
    return { valid: false, error: "Invalid city name" };
  }

  return { valid: true, city: trimmed };
}

function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  // Remove HTML tags and script content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function detectSQLInjection(input) {
  if (typeof input !== "string") return false;

  const sqlPatterns = [
    /(\bOR\b|\bAND\b).*=.*=/i,
    /'\s*(OR|AND)\s*'?\d+'?\s*=\s*'?\d+/i,
    /--/,
    /;.*DROP/i,
    /;.*DELETE/i,
    /;.*UPDATE/i,
    /;.*INSERT/i,
    /UNION.*SELECT/i,
    /'\s*OR\s*1\s*=\s*1/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

module.exports = {
  validateCityName,
  sanitizeInput,
  detectSQLInjection,
};

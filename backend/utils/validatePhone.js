/**
 * Validates and formats Brazilian phone number
 * @param {string} phone - Phone number in format (XX) XXXXX-XXXX or XXXXX-XXXX
 * @returns {object} - { isValid: boolean, formatted: string, digits: string }
 */
export const validatePhone = (phone) => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Brazilian phone format: +55 (DDD) 9XXXX-XXXX (11 digits) or +55 (DDD) XXXX-XXXX (10 digits)
  // We'll accept both formats but normalize to +55XXXXXXXXXXX
  if (digits.length === 10 || digits.length === 11) {
    // If it's 10 or 11 digits, assume it's missing +55 prefix
    const formatted = `+55${digits}`
    return {
      isValid: true,
      formatted,
      digits: formatted
    }
  } else if (digits.length === 13 && digits.startsWith('55')) {
    // Already has +55 prefix
    return {
      isValid: true,
      formatted: `+${digits}`,
      digits: `+${digits}`
    }
  }

  return {
    isValid: false,
    formatted: phone,
    digits: digits
  }
}

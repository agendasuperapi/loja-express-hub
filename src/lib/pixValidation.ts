import { z } from 'zod';

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | 'invalid' | 'empty';

/**
 * Validates if a string is a valid CPF (11 digits) with digit verification
 */
const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/[^\d]/g, '');
  if (cleaned.length !== 11) return false;
  
  // Check for known invalid CPFs (all same digits)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validate first verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  // Validate second verification digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

/**
 * Validates if a string is a valid CNPJ (14 digits) with digit verification
 */
const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/[^\d]/g, '');
  if (cleaned.length !== 14) return false;
  
  // Check for known invalid CNPJs (all same digits)
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validate first verification digit
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Validate second verification digit
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

/**
 * Validates if a string is a valid Brazilian phone number
 */
const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // Brazilian phone formats:
  // 1. With country code: 5538999524679 (13 digits)
  // 2. Without country code: 38999524679 (11 digits - DDD + 9 digits)
  if (cleaned.startsWith('55')) {
    return cleaned.length === 13; // 55 + DDD (2) + number (9)
  }
  
  // DDD (2 digits) + number (9 digits for mobile, 8 for landline)
  return cleaned.length === 11 || cleaned.length === 10;
};

/**
 * Validates if a string is a valid UUID v4 (random key)
 */
const isValidRandomKey = (key: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
};

/**
 * Detects the type of PIX key
 */
export const detectPixKeyType = (key: string): PixKeyType => {
  if (!key || key.trim() === '') return 'empty';
  
  const trimmed = key.trim();
  
  // Check email
  if (z.string().email().safeParse(trimmed).success) {
    return 'email';
  }
  
  // Check random key (UUID)
  if (isValidRandomKey(trimmed)) {
    return 'random';
  }
  
  // Remove all non-digit characters for number checks
  const cleaned = trimmed.replace(/[^\d]/g, '');
  
  // Check CPF
  if (isValidCPF(cleaned)) {
    return 'cpf';
  }
  
  // Check CNPJ
  if (isValidCNPJ(cleaned)) {
    return 'cnpj';
  }
  
  // Check phone
  if (isValidPhone(trimmed)) {
    return 'phone';
  }
  
  return 'invalid';
};

/**
 * Validates a PIX key and returns a validation result
 */
export const validatePixKey = (key: string): { isValid: boolean; type: PixKeyType; message: string } => {
  const type = detectPixKeyType(key);
  
  switch (type) {
    case 'empty':
      return { isValid: true, type, message: '' };
    case 'cpf':
      return { isValid: true, type, message: 'Chave PIX do tipo CPF' };
    case 'cnpj':
      return { isValid: true, type, message: 'Chave PIX do tipo CNPJ' };
    case 'email':
      return { isValid: true, type, message: 'Chave PIX do tipo E-mail' };
    case 'phone':
      return { isValid: true, type, message: 'Chave PIX do tipo Telefone ou cpf' };
    case 'random':
      return { isValid: true, type, message: 'Chave PIX do tipo Aleatória' };
    case 'invalid':
      return { 
        isValid: false, 
        type, 
        message: 'Formato inválido. Use CPF, CNPJ, E-mail, Telefone ou Chave Aleatória' 
      };
    default:
      return { isValid: false, type: 'invalid', message: 'Formato inválido' };
  }
};

/**
 * Normalizes phone PIX keys by removing formatting and +55 prefix
 * Saves only the digits in the database
 */
export const normalizePixKeyPhone = (key: string): string => {
  if (!key || key.trim() === '') return key;
  
  const trimmed = key.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  
  // Remove +55 prefix if present
  if (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
    return digitsOnly.substring(2);
  }
  
  // Return only digits for phone numbers (10-11 digits)
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return digitsOnly;
  }
  
  return key; // Return original if not a phone
};

/**
 * Formats a PIX key for display based on its type
 */
export const formatPixKey = (key: string): string => {
  const type = detectPixKeyType(key);
  const cleaned = key.replace(/[^\d]/g, '');
  
  switch (type) {
    case 'cpf':
      // Format: 123.456.789-01
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    case 'cnpj':
      // Format: 12.345.678/0001-90
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    case 'phone':
      // Format: +55 (11) 99999-9999
      if (cleaned.startsWith('55')) {
        const ddd = cleaned.substring(2, 4);
        const number = cleaned.substring(4);
        return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
      }
      const ddd = cleaned.substring(0, 2);
      const number = cleaned.substring(2);
      return `(${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
    default:
      return key;
  }
};

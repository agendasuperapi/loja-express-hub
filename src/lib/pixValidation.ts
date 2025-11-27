import { z } from 'zod';

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | 'invalid' | 'empty';

/**
 * Validates if a string is a valid CPF (11 digits)
 */
const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/[^\d]/g, '');
  if (cleaned.length !== 11) return false;
  
  // Check for known invalid CPFs (all same digits)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  return true;
};

/**
 * Validates if a string is a valid CNPJ (14 digits)
 */
const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/[^\d]/g, '');
  if (cleaned.length !== 14) return false;
  
  // Check for known invalid CNPJs (all same digits)
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
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
      return { isValid: true, type, message: 'Chave PIX do tipo Telefone' };
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
 * Formats PIX key as user types based on detected type
 */
export const formatPixKeyAsTyping = (value: string): string => {
  if (!value) return '';
  
  // Remove all non-alphanumeric except @ and . for email
  const cleaned = value.replace(/[^\w@.-]/g, '');
  
  // Check if it's an email (has @ or looks like email)
  if (cleaned.includes('@') || /^[a-zA-Z0-9._-]+$/.test(cleaned)) {
    return cleaned;
  }
  
  // Only digits for CPF/CNPJ/Phone formatting
  const digitsOnly = cleaned.replace(/\D/g, '');
  
  if (!digitsOnly) return value;
  
  // UUID/Random key (has letters and numbers with hyphens)
  if (/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(value)) {
    return value;
  }
  
  // CPF: 123.456.789-01 (11 digits)
  if (digitsOnly.length <= 11) {
    let formatted = digitsOnly;
    if (digitsOnly.length > 3) {
      formatted = digitsOnly.substring(0, 3) + '.' + digitsOnly.substring(3);
    }
    if (digitsOnly.length > 6) {
      formatted = formatted.substring(0, 7) + '.' + formatted.substring(7);
    }
    if (digitsOnly.length > 9) {
      formatted = formatted.substring(0, 11) + '-' + formatted.substring(11);
    }
    return formatted;
  }
  
  // Phone with country code: +55 (38) 99952-4679 (13 digits starting with 55)
  if (digitsOnly.startsWith('55') && digitsOnly.length <= 13) {
    let formatted = '+55';
    if (digitsOnly.length > 2) {
      formatted += ' (' + digitsOnly.substring(2, Math.min(4, digitsOnly.length));
    }
    if (digitsOnly.length > 4) {
      formatted += ') ' + digitsOnly.substring(4, Math.min(9, digitsOnly.length));
    }
    if (digitsOnly.length > 9) {
      formatted += '-' + digitsOnly.substring(9, 13);
    }
    return formatted;
  }
  
  // CNPJ: 12.345.678/0001-90 (14 digits)
  if (digitsOnly.length > 11) {
    let formatted = digitsOnly;
    if (digitsOnly.length > 2) {
      formatted = digitsOnly.substring(0, 2) + '.' + digitsOnly.substring(2);
    }
    if (digitsOnly.length > 5) {
      formatted = formatted.substring(0, 6) + '.' + formatted.substring(6);
    }
    if (digitsOnly.length > 8) {
      formatted = formatted.substring(0, 10) + '/' + formatted.substring(10);
    }
    if (digitsOnly.length > 12) {
      formatted = formatted.substring(0, 15) + '-' + formatted.substring(15);
    }
    return formatted;
  }
  
  return digitsOnly;
};

/**
 * Removes formatting from PIX key to get clean value
 */
export const cleanPixKey = (value: string): string => {
  // Keep email format
  if (value.includes('@')) {
    return value.trim();
  }
  
  // Keep UUID format
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) {
    return value.toLowerCase();
  }
  
  // Remove all formatting, keep only digits
  return value.replace(/\D/g, '');
};

/**
 * Normalizes a PIX phone key by adding +55 prefix if needed
 */
export const normalizePixPhoneKey = (key: string): string => {
  const cleaned = key.replace(/[^\d]/g, '');
  
  // Se já tem o +55, retornar com o +
  if (key.startsWith('+55')) {
    return key;
  }
  
  // Se tem 13 dígitos começando com 55, adicionar o +
  if (cleaned.startsWith('55') && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  
  // Se tem 10 ou 11 dígitos (DDD + número), adicionar +55
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `+55${cleaned}`;
  }
  
  // Retornar como está se não for um dos casos acima
  return key;
};

/**
 * Removes +55 prefix from PIX phone key for display
 */
export const formatPixPhoneKeyForDisplay = (key: string): string => {
  if (!key) return '';
  
  // Remove +55 do início
  if (key.startsWith('+55')) {
    return key.substring(3);
  }
  
  return key;
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
      // Format: (11) 99999-9999 (sem o +55)
      const displayKey = formatPixPhoneKeyForDisplay(key);
      const displayCleaned = displayKey.replace(/[^\d]/g, '');
      const ddd = displayCleaned.substring(0, 2);
      const number = displayCleaned.substring(2);
      return `(${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
    default:
      return key;
  }
};

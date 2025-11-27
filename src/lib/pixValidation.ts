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

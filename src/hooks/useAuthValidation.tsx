import { z } from 'zod';

// Validation schema for authentication
export const signUpSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(128, 'Senha muito longa'),
  fullName: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  phone: z.string()
    .refine(val => {
      // Remove caracteres não numéricos exceto o +
      const cleaned = val?.replace(/[^\d+]/g, '') || '';
      // Aceita formato +55XXXXXXXXXXX (13 ou 14 caracteres com +55)
      return !val || cleaned.startsWith('+55') && (cleaned.length === 13 || cleaned.length === 14);
    }, {
      message: 'Telefone inválido. Use o formato (XX) XXXXX-XXXX'
    }).optional(),
});

export const signInSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(128, 'Senha muito longa'),
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;

import { z } from 'zod';

// Validation schema for store creation
export const storeSchema = z.object({
  name: z.string().trim().min(1, 'Nome da loja é obrigatório').max(200, 'Nome muito longo'),
  slug: z.string()
    .trim()
    .min(1, 'URL da loja é obrigatória')
    .max(100, 'URL muito longa')
    .regex(/^[a-z0-9-]+$/, 'URL deve conter apenas letras minúsculas, números e hífens')
    .refine(val => !val.includes(' '), {
      message: 'URL não pode conter espaços'
    }),
  description: z.string().trim().max(1000, 'Descrição muito longa').optional(),
  category: z.string().trim().min(1, 'Categoria é obrigatória').max(100),
  address: z.string().trim().max(500, 'Endereço muito longo').optional(),
  phone: z.string()
    .transform(val => val?.replace(/\D/g, '') || '')
    .refine(val => !val || val.length >= 10, {
      message: 'Telefone inválido'
    }).optional(),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo').optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(128, 'Senha muito longa').optional(),
  confirmPassword: z.string().optional(),
  delivery_fee: z.number().min(0, 'Taxa de entrega inválida').max(1000, 'Taxa muito alta'),
  min_order_value: z.number().min(0, 'Valor mínimo inválido').max(10000, 'Valor muito alto'),
  avg_delivery_time: z.number().int().min(0, 'Tempo de entrega inválido').max(500, 'Tempo muito longo'),
  owner_name: z.string().trim().min(2, 'Nome do proprietário é obrigatório').max(100, 'Nome muito longo'),
  owner_phone: z.string()
    .transform(val => val.replace(/\D/g, ''))
    .refine(val => val.length >= 10, {
      message: 'Telefone inválido'
    }),
}).refine((data) => {
  // Validate password confirmation if password is provided
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export type StoreFormData = z.infer<typeof storeSchema>;

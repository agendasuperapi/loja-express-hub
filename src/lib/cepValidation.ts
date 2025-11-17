import { z } from "zod";

// Schema de validação para CEP brasileiro
export const cepSchema = z.string()
  .trim()
  .regex(/^\d{5}-?\d{3}$/, "CEP inválido. Use o formato: 12345-678")
  .transform((val) => val.replace(/\D/g, '')) // Remove hífen
  .refine((val) => val.length === 8, "CEP deve ter 8 dígitos");

// Formatar CEP com hífen (aplica máscara enquanto digita)
export const formatCep = (cep: string): string => {
  // Remove tudo que não é número
  const cleaned = cep.replace(/\D/g, '');
  
  // Limita a 8 dígitos
  const limited = cleaned.slice(0, 8);
  
  // Aplica a máscara progressivamente
  if (limited.length <= 5) {
    return limited;
  }
  
  // Formato: 12345-678
  return `${limited.slice(0, 5)}-${limited.slice(5)}`;
};

// Interface de resposta da API ViaCEP
export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

// Buscar informações do CEP na API ViaCEP
export const fetchCepData = async (cep: string): Promise<ViaCepResponse | null> => {
  try {
    // Validar formato do CEP
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      throw new Error("CEP deve ter 8 dígitos");
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
    
    if (!response.ok) {
      throw new Error("Erro ao consultar CEP");
    }

    const data: ViaCepResponse = await response.json();

    // ViaCEP retorna {erro: true} para CEPs não encontrados
    if (data.erro) {
      throw new Error("CEP não encontrado");
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
};

// Validar se é um CEP válido (formato)
export const isValidCepFormat = (cep: string): boolean => {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8 && /^\d+$/.test(cleaned);
};

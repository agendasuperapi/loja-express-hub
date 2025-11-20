export interface AddonItem {
  name: string;
  price: number;
}

export interface CategoryTemplate {
  name: string;
  addons: AddonItem[];
}

export interface FlavorTemplate {
  name: string;
  description?: string;
  price: number;
}

export interface BusinessTemplate {
  id: string;
  name: string;
  businessType: string;
  icon: string;
  description: string;
  categories: CategoryTemplate[];
  flavors?: FlavorTemplate[];
}

export const addonTemplates: BusinessTemplate[] = [
  {
    id: 'pizzaria',
    name: 'Pizzaria',
    businessType: 'Pizzaria',
    icon: '🍕',
    description: 'Template completo para pizzarias com bordas, tamanhos e bebidas',
    categories: [
      {
        name: 'Bordas',
        addons: [
          { name: 'Borda Catupiry', price: 8.00 },
          { name: 'Borda Cheddar', price: 8.00 },
          { name: 'Borda Chocolate', price: 10.00 },
          { name: 'Borda Cream Cheese', price: 9.00 },
        ],
      },
      {
        name: 'Tamanhos',
        addons: [
          { name: 'Pequena (25cm)', price: 0 },
          { name: 'Média (30cm)', price: 5.00 },
          { name: 'Grande (35cm)', price: 10.00 },
          { name: 'Gigante (40cm)', price: 15.00 },
        ],
      },
      {
        name: 'Bebidas',
        addons: [
          { name: 'Refrigerante Lata', price: 5.00 },
          { name: 'Refrigerante 2L', price: 10.00 },
          { name: 'Suco Natural', price: 8.00 },
          { name: 'Água Mineral', price: 3.00 },
        ],
      },
    ],
  },
  {
    id: 'hamburgueria',
    name: 'Hamburgueria',
    businessType: 'Hamburgueria',
    icon: '🍔',
    description: 'Template para hamburguerias com carnes, queijos, molhos e extras',
    categories: [
      {
        name: 'Tipo de Carne',
        addons: [
          { name: 'Carne Bovina 150g', price: 0 },
          { name: 'Carne Bovina 200g', price: 5.00 },
          { name: 'Carne de Frango', price: 0 },
          { name: 'Carne Vegana', price: 8.00 },
        ],
      },
      {
        name: 'Queijos',
        addons: [
          { name: 'Queijo Cheddar', price: 3.00 },
          { name: 'Queijo Mussarela', price: 2.50 },
          { name: 'Queijo Prato', price: 2.50 },
          { name: 'Cream Cheese', price: 4.00 },
        ],
      },
      {
        name: 'Molhos Especiais',
        addons: [
          { name: 'Molho Barbecue', price: 2.00 },
          { name: 'Molho da Casa', price: 2.00 },
          { name: 'Molho Picante', price: 2.00 },
          { name: 'Maionese Especial', price: 2.50 },
        ],
      },
      {
        name: 'Extras',
        addons: [
          { name: 'Bacon', price: 5.00 },
          { name: 'Ovo', price: 3.00 },
          { name: 'Cebola Caramelizada', price: 3.50 },
          { name: 'Champignon', price: 4.00 },
        ],
      },
    ],
  },
  {
    id: 'acaiteria',
    name: 'Açaíteria',
    businessType: 'Açaíteria',
    icon: '🍨',
    description: 'Template para açaíterias com tamanhos, frutas e complementos',
    categories: [
      {
        name: 'Tamanhos',
        addons: [
          { name: 'Pequeno (300ml)', price: 0 },
          { name: 'Médio (500ml)', price: 5.00 },
          { name: 'Grande (700ml)', price: 10.00 },
        ],
      },
      {
        name: 'Frutas',
        addons: [
          { name: 'Banana', price: 2.00 },
          { name: 'Morango', price: 3.00 },
          { name: 'Kiwi', price: 3.50 },
          { name: 'Manga', price: 2.50 },
        ],
      },
      {
        name: 'Complementos',
        addons: [
          { name: 'Granola', price: 2.00 },
          { name: 'Leite em Pó', price: 1.50 },
          { name: 'Paçoca', price: 2.50 },
          { name: 'Amendoim', price: 2.00 },
        ],
      },
      {
        name: 'Coberturas',
        addons: [
          { name: 'Mel', price: 3.00 },
          { name: 'Leite Condensado', price: 2.50 },
          { name: 'Chocolate', price: 3.00 },
          { name: 'Nutella', price: 5.00 },
        ],
      },
    ],
  },
  {
    id: 'lanchonete',
    name: 'Lanchonete',
    businessType: 'Lanchonete',
    icon: '🥪',
    description: 'Template para lanchonetes com bebidas, porções e acompanhamentos',
    categories: [
      {
        name: 'Bebidas',
        addons: [
          { name: 'Refrigerante Lata', price: 5.00 },
          { name: 'Suco Natural', price: 7.00 },
          { name: 'Água com Gás', price: 4.00 },
          { name: 'Milkshake', price: 12.00 },
        ],
      },
      {
        name: 'Porções',
        addons: [
          { name: 'Batata Frita', price: 15.00 },
          { name: 'Onion Rings', price: 18.00 },
          { name: 'Nuggets', price: 20.00 },
          { name: 'Polenta Frita', price: 16.00 },
        ],
      },
      {
        name: 'Acompanhamentos',
        addons: [
          { name: 'Maionese', price: 2.00 },
          { name: 'Ketchup', price: 1.50 },
          { name: 'Mostarda', price: 1.50 },
          { name: 'Molho Especial', price: 2.50 },
        ],
      },
    ],
  },
  {
    id: 'cafeteria',
    name: 'Cafeteria',
    businessType: 'Cafeteria',
    icon: '☕',
    description: 'Template para cafeterias com tamanhos, tipos de leite e extras',
    categories: [
      {
        name: 'Tamanhos',
        addons: [
          { name: 'Pequeno (120ml)', price: 0 },
          { name: 'Médio (240ml)', price: 3.00 },
          { name: 'Grande (360ml)', price: 5.00 },
        ],
      },
      {
        name: 'Tipos de Leite',
        addons: [
          { name: 'Leite Integral', price: 0 },
          { name: 'Leite Desnatado', price: 0 },
          { name: 'Leite de Amêndoas', price: 3.00 },
          { name: 'Leite de Soja', price: 2.00 },
        ],
      },
      {
        name: 'Adoçantes',
        addons: [
          { name: 'Açúcar', price: 0 },
          { name: 'Adoçante', price: 0 },
          { name: 'Mel', price: 2.00 },
          { name: 'Xarope de Agave', price: 2.50 },
        ],
      },
      {
        name: 'Extras',
        addons: [
          { name: 'Shot Extra de Café', price: 3.00 },
          { name: 'Chantilly', price: 3.50 },
          { name: 'Caramelo', price: 2.00 },
          { name: 'Chocolate', price: 2.50 },
        ],
      },
    ],
  },
  {
    id: 'restaurante',
    name: 'Restaurante',
    businessType: 'Restaurante',
    icon: '🍽️',
    description: 'Template completo para restaurantes com acompanhamentos, molhos, bebidas e sobremesas',
    categories: [
      {
        name: 'Acompanhamentos',
        addons: [
          { name: 'Arroz Branco', price: 5.00 },
          { name: 'Feijão', price: 5.00 },
          { name: 'Batata Frita', price: 8.00 },
          { name: 'Purê de Batata', price: 7.00 },
          { name: 'Farofa', price: 6.00 },
          { name: 'Legumes no Vapor', price: 8.00 },
        ],
      },
      {
        name: 'Saladas e Verduras',
        addons: [
          { name: 'Salada Verde', price: 8.00 },
          { name: 'Salada Caesar', price: 12.00 },
          { name: 'Vinagrete', price: 5.00 },
          { name: 'Couve Refogada', price: 6.00 },
        ],
      },
      {
        name: 'Molhos',
        addons: [
          { name: 'Molho de Tomate Caseiro', price: 3.00 },
          { name: 'Molho Branco', price: 4.00 },
          { name: 'Molho Madeira', price: 5.00 },
          { name: 'Vinagrete', price: 2.00 },
          { name: 'Molho de Pimenta', price: 2.00 },
        ],
      },
      {
        name: 'Bebidas',
        addons: [
          { name: 'Refrigerante Lata', price: 5.00 },
          { name: 'Refrigerante 2L', price: 12.00 },
          { name: 'Suco Natural 300ml', price: 8.00 },
          { name: 'Suco Natural 500ml', price: 12.00 },
          { name: 'Água Mineral', price: 3.00 },
          { name: 'Água com Gás', price: 4.00 },
        ],
      },
      {
        name: 'Sobremesas',
        addons: [
          { name: 'Pudim', price: 8.00 },
          { name: 'Brigadeiro', price: 2.00 },
          { name: 'Sorvete', price: 10.00 },
          { name: 'Mousse de Chocolate', price: 9.00 },
          { name: 'Petit Gateau', price: 15.00 },
        ],
      },
      {
        name: 'Ponto da Carne',
        addons: [
          { name: 'Mal Passado', price: 0 },
          { name: 'Ao Ponto', price: 0 },
          { name: 'Bem Passado', price: 0 },
        ],
      },
    ],
  },
];

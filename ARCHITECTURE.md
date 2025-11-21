# Arquitetura do Sistema - Ofertas.app

## 🎯 Princípio Fundamental

**TODAS as lojas devem ter as MESMAS funcionalidades.**

Não existem lojas "especiais" no código. Todas as diferenças entre lojas são controladas através de **configurações no banco de dados**, não através de condicionais no código.

## ❌ PROIBIDO

### Nunca use hard-coding de lojas específicas:

```typescript
// ❌ ERRADO - NUNCA FAÇA ISSO
if (store.slug === 'drogaclaramoc') {
  // código especial
}

// ❌ ERRADO - NUNCA FAÇA ISSO
if (store.id === 'abc-123') {
  // código especial
}

// ❌ ERRADO - NUNCA FAÇA ISSO
{store.slug !== 'minhaloja' && (
  <Component />
)}
```

### Por que isso é ruim?
- 🚫 Quebra a escalabilidade
- 🚫 Dificulta manutenção
- 🚫 Cria código duplicado
- 🚫 Aumenta risco de bugs
- 🚫 Dificulta testes
- 🚫 Viola princípios SOLID

## ✅ CORRETO

### Use configurações do banco de dados:

```typescript
// ✅ CORRETO - Use configurações do banco
{store.show_avg_delivery_time && (
  <DeliveryTime time={store.avg_delivery_time} />
)}

// ✅ CORRETO - Use flags de feature
{store.enable_combos && (
  <CombosSection />
)}

// ✅ CORRETO - Use permissões
{hasPermission('orders', 'edit') && (
  <EditButton />
)}
```

## 🗄️ Sistema de Configurações

### Tabela `stores`
Todas as configurações de funcionalidades ficam na tabela `stores`:

```sql
-- Exemplos de colunas de configuração
show_avg_delivery_time BOOLEAN DEFAULT true
accepts_delivery BOOLEAN DEFAULT true
accepts_pickup BOOLEAN DEFAULT true
accepts_pix BOOLEAN DEFAULT true
accepts_card BOOLEAN DEFAULT true
accepts_cash BOOLEAN DEFAULT true
require_delivery_zone BOOLEAN DEFAULT false
allow_orders_when_closed BOOLEAN DEFAULT false
show_pix_key_to_customer BOOLEAN DEFAULT false
```

### Como adicionar nova funcionalidade?

1. **Adicionar coluna na tabela `stores`**:
```sql
ALTER TABLE stores 
ADD COLUMN enable_nova_feature BOOLEAN DEFAULT true;
```

2. **Atualizar TypeScript types** (automático via Supabase CLI)

3. **Usar no código**:
```typescript
{store.enable_nova_feature && (
  <NovaFeature />
)}
```

## 🔐 Sistema de Permissões

Para funcionalidades específicas de funcionários, use o sistema de permissões:

```typescript
const { hasPermission } = useDynamicPermissions(storeId);

{hasPermission('products', 'create') && (
  <AddProductButton />
)}
```

Configurações de permissões ficam em `src/config/permissions.ts`.

## 📋 Checklist de Desenvolvimento

Antes de fazer commit, verifique:

- [ ] ✅ Não usei `store.slug === 'xxx'`
- [ ] ✅ Não usei `store.id === 'xxx'`
- [ ] ✅ Usei configurações do banco de dados
- [ ] ✅ Testei em múltiplas lojas
- [ ] ✅ Documentei novas configurações
- [ ] ✅ Features são opt-in, não opt-out

## 🚀 Fluxo de Desenvolvimento

### Nova Feature

1. **Design**: Decidir configuração necessária
2. **Database**: Adicionar coluna em `stores` ou usar permissões
3. **Frontend**: Implementar usando configuração
4. **Testing**: Testar em 3+ lojas diferentes
5. **Documentation**: Atualizar este documento

### Correção de Bug

1. **Identificar**: Buscar por hard-coding
2. **Refatorar**: Converter para configuração
3. **Migrar**: Atualizar banco se necessário
4. **Validar**: Testar em todas as lojas

## 🏗️ Componentes Universais

### Modais
Todos os modais devem ser reutilizáveis:
- `NewAddonDialog`: Modal de adicionais (universal)
- `EditOrderDialog`: Modal de edição de pedidos (universal)
- `NotesDialog`: Modal de observações (universal)
- `ReceiptDialog`: Modal de comprovante (universal)

### Hooks
Hooks devem funcionar para qualquer loja:
- `useProducts`: Produtos de qualquer loja
- `useOrders`: Pedidos de qualquer loja
- `useCoupons`: Cupons de qualquer loja

## 📊 Exemplo Real

### ❌ Antes (Errado)
```typescript
{store.slug !== 'drogaclaramoc' && (
  <div className="flex items-center gap-1">
    <Clock className="w-4 h-4" />
    <span>{store.avg_delivery_time || 30} min</span>
  </div>
)}
```

### ✅ Depois (Correto)
```typescript
{store.show_avg_delivery_time !== false && (
  <div className="flex items-center gap-1">
    <Clock className="w-4 h-4" />
    <span>{store.avg_delivery_time || 30} min</span>
  </div>
)}
```

## 🔍 Busca por Hard-Coding

Execute regularmente estas buscas no código:

```bash
# Buscar por slug específico
grep -r "store.slug ===" src/
grep -r "store.slug !==" src/

# Buscar por id específico
grep -r "store.id ===" src/
grep -r "store.id !==" src/

# Buscar por nomes de lojas
grep -r "drogaclara" src/
```

## 🎓 Princípios de Design

### 1. Configuração sobre Código
Prefira banco de dados a condicionais.

### 2. Universal por Padrão
Features devem funcionar para todas as lojas.

### 3. Opt-in via Configuração
Se precisa desabilitar, use configuração do banco.

### 4. Testabilidade
Código universal é mais fácil de testar.

### 5. Escalabilidade
Novas lojas funcionam automaticamente.

## 📚 Recursos

- TypeScript Types: `src/integrations/supabase/types.ts`
- Permissions Config: `src/config/permissions.ts`
- Database Schema: Supabase Dashboard

## 🔄 Processo de Code Review

Reviewers devem verificar:
1. Nenhum hard-coding de loja específica
2. Uso correto de configurações
3. Testes em múltiplas lojas
4. Documentação atualizada

---

**Lembre-se**: Código limpo é código universal. Configuração é chave. Todas as lojas são iguais.

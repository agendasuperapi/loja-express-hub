# ✅ Checklist de Desenvolvimento - Ofertas.app

## 🚫 Regras de Ouro (NUNCA VIOLE)

### ❌ PROIBIDO
- [ ] Usar `if (store.slug === 'nome-loja')`
- [ ] Usar `if (store.id === 'uuid')`
- [ ] Hard-codar nome de lojas em strings
- [ ] Criar funcionalidades exclusivas para uma loja
- [ ] Fazer condicionais baseadas em slug/id de loja

### ✅ OBRIGATÓRIO
- [ ] Usar configurações do banco de dados (`store.enable_feature`)
- [ ] Testar em pelo menos 3 lojas diferentes
- [ ] Documentar novas configurações
- [ ] Manter funcionalidades universais
- [ ] Seguir princípio: "Configuração sobre Código"

## 📝 Antes de Fazer Commit

### Code Quality
- [ ] Removi todos os `console.log()` de debug
- [ ] Código segue padrões TypeScript
- [ ] Não há warnings de ESLint
- [ ] Imports organizados e sem duplicatas
- [ ] Componentes têm nomes descritivos

### Universalidade
- [ ] Feature funciona para TODAS as lojas
- [ ] Não há hard-coding de loja específica
- [ ] Usei configurações do banco quando necessário
- [ ] Testei em múltiplas lojas (mínimo 3)

### Database
- [ ] Novas colunas têm valores DEFAULT
- [ ] Migrations estão documentadas
- [ ] RLS policies estão corretas
- [ ] Indexes criados quando necessário

### Frontend
- [ ] Componentes são reutilizáveis
- [ ] Estados gerenciados corretamente
- [ ] Loading states implementados
- [ ] Error handling presente
- [ ] Toast notifications apropriadas

### Performance
- [ ] Queries otimizadas
- [ ] Não há loops desnecessários
- [ ] Imagens otimizadas
- [ ] Lazy loading quando apropriado

### Segurança
- [ ] Validações no frontend E backend
- [ ] Dados sensíveis não expostos
- [ ] RLS policies protegem dados
- [ ] Inputs sanitizados

### UX/UI
- [ ] Interface responsiva (mobile + desktop)
- [ ] Estados de loading visíveis
- [ ] Mensagens de erro claras
- [ ] Confirmações para ações destrutivas
- [ ] Acessibilidade básica (alt text, labels)

## 🧪 Checklist de Testes

### Testes Funcionais
- [ ] Feature funciona na loja principal
- [ ] Feature funciona em loja secundária
- [ ] Feature funciona em loja de teste
- [ ] Funciona com dados vazios
- [ ] Funciona com muitos dados

### Testes de Integração
- [ ] Funciona com WhatsApp integrado
- [ ] Funciona com Evolution API
- [ ] Funciona com sistema de pedidos
- [ ] Funciona com sistema de cupons

### Testes de Edge Cases
- [ ] Funciona com internet lenta
- [ ] Funciona com dados inválidos
- [ ] Funciona quando API falha
- [ ] Funciona em diferentes navegadores
- [ ] Funciona em diferentes dispositivos

## 📋 Checklist por Tipo de Mudança

### 🆕 Nova Feature

#### 1. Planejamento
- [ ] Feature está documentada
- [ ] Configurações necessárias identificadas
- [ ] Impacto em outras features analisado

#### 2. Database
- [ ] Migration criada
- [ ] Coluna de configuração adicionada em `stores`
- [ ] Valor DEFAULT definido (geralmente `true`)
- [ ] Types TypeScript atualizados

#### 3. Implementação
- [ ] Componentes criados/atualizados
- [ ] Hooks necessários criados
- [ ] Lógica de negócio implementada
- [ ] Condicional usa configuração do banco

#### 4. Validação
- [ ] Testado em 3+ lojas
- [ ] Testado com feature habilitada
- [ ] Testado com feature desabilitada
- [ ] Performance verificada

#### 5. Documentação
- [ ] README atualizado
- [ ] ARCHITECTURE.md atualizado
- [ ] Comentários no código
- [ ] Changelog atualizado

### 🐛 Correção de Bug

#### 1. Identificação
- [ ] Bug reproduzido
- [ ] Causa identificada
- [ ] Lojas afetadas listadas

#### 2. Correção
- [ ] Código corrigido
- [ ] Hard-coding removido se existir
- [ ] Testes adicionados
- [ ] Regressões verificadas

#### 3. Validação
- [ ] Bug não reproduz mais
- [ ] Features relacionadas funcionam
- [ ] Testado em múltiplas lojas

### 🔄 Refatoração

#### 1. Análise
- [ ] Código atual analisado
- [ ] Melhorias identificadas
- [ ] Impacto avaliado

#### 2. Execução
- [ ] Código refatorado mantém mesma funcionalidade
- [ ] Hard-coding removido
- [ ] Configurações movidas para banco
- [ ] Componentes simplificados

#### 3. Validação
- [ ] Funcionalidade idêntica
- [ ] Performance igual ou melhor
- [ ] Sem regressões
- [ ] Código mais limpo

### 🎨 Mudanças de UI/UX

#### 1. Design
- [ ] Design system respeitado
- [ ] Cores usam tokens semânticos
- [ ] Tipografia consistente
- [ ] Espaçamentos padronizados

#### 2. Responsividade
- [ ] Mobile (320px+)
- [ ] Tablet (768px+)
- [ ] Desktop (1024px+)
- [ ] Large Desktop (1440px+)

#### 3. Acessibilidade
- [ ] Contraste adequado (WCAG AA)
- [ ] Alt text em imagens
- [ ] Labels em inputs
- [ ] Navegação por teclado

## 🔍 Code Review Checklist

### Para Revisor
- [ ] Código segue ARCHITECTURE.md
- [ ] Não há hard-coding de lojas
- [ ] Testes foram executados
- [ ] Documentação está completa
- [ ] Performance está adequada
- [ ] Segurança está garantida

### Para Autor
- [ ] Self-review feito
- [ ] Testes documentados
- [ ] Breaking changes comunicados
- [ ] Decisões técnicas explicadas

## 📚 Recursos Rápidos

### Buscar Hard-Coding
```bash
# Buscar problemas comuns
grep -r "store.slug ===" src/
grep -r "store.id ===" src/
grep -r "drogaclara" src/
```

### Validar Configurações
```typescript
// Verificar se configuração existe
const hasConfig = 'new_feature_flag' in store;

// Usar com fallback
const enabled = store.new_feature_flag ?? true;
```

### Testar em Múltiplas Lojas
1. Abrir loja principal
2. Abrir loja secundária em aba anônima
3. Testar feature em ambas
4. Verificar comportamento idêntico

## ⚡ Quick Commands

```bash
# Buscar por lojas específicas no código
npm run search:hardcoding

# Validar TypeScript
npm run type-check

# Executar linter
npm run lint

# Build de produção
npm run build
```

## 📞 Precisa de Ajuda?

- 📖 Leia `ARCHITECTURE.md`
- 🔍 Use busca no código
- 💬 Pergunte no time
- 📝 Documente decisões

---

**Lembre-se**: Código limpo hoje = manutenção fácil amanhã. Sempre pense no próximo desenvolvedor (pode ser você!).

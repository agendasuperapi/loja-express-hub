# 🔧 Troubleshooting do Workflow

Este guia ajuda a resolver problemas comuns no workflow de deploy.

## ❌ Erro: "Build failed"

### Verificar logs do build
1. Vá em **Actions** > Selecione o workflow que falhou
2. Clique no job **Build Web Application**
3. Expanda o step que falhou para ver o erro

### Problemas comuns:

#### 1. Variáveis de ambiente não configuradas
**Erro**: `VITE_SUPABASE_URL is not defined`

**Solução**: 
- Vá em **Settings > Secrets and variables > Actions**
- Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

#### 2. Erro de dependências
**Erro**: `npm ci` falha

**Solução**:
- Verifique se o `package-lock.json` está atualizado
- Execute `npm install` localmente e faça commit do `package-lock.json`

#### 3. Erro de build do Vite
**Erro**: Erros de TypeScript ou compilação

**Solução**:
- Execute `npm run build` localmente para ver o erro
- Corrija os erros e faça commit

## ❌ Erro: "Deploy failed" (FTP)

### Verificar credenciais FTP

1. **Host FTP incorreto ou não resolvido (Erro: getaddrinfo NOT FOUND)**
   - **Formato correto**: `ftp.seusite.com` ou `IP direto`
   - **NÃO inclua**: `ftp://`, `http://`, `https://` ou porta `:21`
   - **Exemplo correto**: `ftp.ofertas.app` ou `123.456.789.0`
   - **Exemplo errado**: `ftp://ftp.ofertas.app` ou `ftp.ofertas.app:21`
   - **Solução**: 
     * Verifique no painel da Hostinger o host FTP exato
     * Use apenas o hostname, sem protocolo
     * Se o erro persistir, tente usar o IP direto do servidor
     * Teste a resolução DNS: `nslookup ftp.seusite.com`

2. **Usuário/Senha incorretos**
   - Verifique no painel da Hostinger (hPanel)
   - Vá em **FTP** > **Gerenciador de Arquivos**
   - Confirme usuário e senha

3. **Caminho do servidor incorreto**
   - Padrão: `/public_html/`
   - Para subdomínios: `/public_html/subdominio/`
   - Verifique no File Manager da Hostinger

### Testar conexão FTP manualmente

Use um cliente FTP (FileZilla, WinSCP) para testar:
- Host: `HOSTINGER_FTP_HOST`
- Usuário: `HOSTINGER_FTP_USER`
- Senha: `HOSTINGER_FTP_PASSWORD`
- Porta: `21` (padrão) ou `22` (SFTP)

### Erros comuns do FTP-Deploy-Action

#### "Connection timeout"
- Verifique se o firewall da Hostinger permite conexões FTP
- Tente usar SFTP (porta 22) em vez de FTP (porta 21)

#### "Authentication failed"
- Verifique se o usuário e senha estão corretos
- Certifique-se de que não há espaços extras nos secrets

#### "Path not found"
- Verifique o `HOSTINGER_FTP_PATH`
- Tente com `/` ou `/public_html/`
- Confirme o caminho no File Manager

## ❌ Erro: "Android build failed"

### Diretório android não existe
**Erro**: `Diretório android não encontrado`

**Solução**: 
- Configure o Capacitor primeiro (veja `DEPLOY_SETUP.md`)
- Execute: `bash scripts/setup-android.sh`

### Erro de Gradle
**Erro**: `./gradlew: Permission denied`

**Solução**: Já está corrigido no workflow (chmod +x)

**Erro**: `Gradle build failed`

**Solução**:
- Verifique se o `android/app/build.gradle` está configurado corretamente
- Veja `.github/ANDROID_GRADLE_EXAMPLE.md`

## 🔍 Como verificar logs detalhados

1. **No GitHub Actions**:
   - Vá em **Actions** > Selecione o workflow
   - Clique no job que falhou
   - Expanda cada step para ver logs detalhados

2. **Verificar secrets**:
   - Vá em **Settings > Secrets and variables > Actions**
   - Verifique se todos os secrets estão configurados
   - ⚠️ Não é possível ver os valores, apenas confirmar que existem

## 📋 Checklist de Verificação

Antes de reportar um problema, verifique:

- [ ] Todos os secrets estão configurados
- [ ] Credenciais FTP estão corretas
- [ ] Caminho do servidor está correto
- [ ] Build funciona localmente (`npm run build`)
- [ ] Conexão FTP funciona manualmente
- [ ] Logs do workflow foram verificados

## 🆘 Ainda com problemas?

1. **Copie o erro completo** dos logs do GitHub Actions
2. **Verifique** se seguiu todos os passos do `DEPLOY_SETUP.md`
3. **Teste localmente**:
   ```bash
   npm run build
   # Teste upload FTP manualmente
   ```

## 💡 Dicas

- **Sempre verifique os logs completos** no GitHub Actions
- **Teste localmente primeiro** antes de fazer push
- **Mantenha os secrets atualizados** se mudar credenciais
- **Use dry-run** para testar sem fazer deploy real (adicione `dry-run: true` temporariamente)


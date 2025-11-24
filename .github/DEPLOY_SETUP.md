# Guia de Configuração do Deploy Automático

Este guia explica como configurar o deploy automático para Hostinger e builds Android.

## 📋 Pré-requisitos

1. Repositório no GitHub
2. Conta na Hostinger com acesso FTP
3. (Opcional) Configuração do Capacitor para builds Android

## 🔐 Configuração dos Secrets do GitHub

Vá em **Settings > Secrets and variables > Actions** no seu repositório GitHub e adicione:

### Secrets Necessários para Deploy Web:

- `HOSTINGER_FTP_HOST` - Host FTP (ex: `ftp.seusite.com` ou IP)
- `HOSTINGER_FTP_USER` - Usuário FTP
- `HOSTINGER_FTP_PASSWORD` - Senha FTP
- `HOSTINGER_FTP_PATH` - Caminho no servidor (ex: `/public_html/` ou `/`)
- `VITE_SUPABASE_URL` - URL do Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase

### Como encontrar as credenciais FTP na Hostinger:

1. Acesse o painel da Hostinger (hPanel)
2. Vá em **FTP** ou **Gerenciador de Arquivos**
3. Crie um usuário FTP se ainda não tiver
4. Anote o host, usuário e senha

## 🚀 Deploy Automático

O workflow será executado automaticamente quando você fizer push para a branch `main`.

Para executar manualmente:
1. Vá em **Actions** no GitHub
2. Selecione o workflow **Build and Deploy**
3. Clique em **Run workflow**

## 📱 Configuração para Builds Android

Para gerar APK e AAB, você precisa configurar o Capacitor primeiro.

### Passo 1: Instalar Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npx cap init
```

### Passo 2: Configurar o Capacitor

Edite `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.seudominio.app',
  appName: 'App Delivery',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### Passo 3: Adicionar plataforma Android

```bash
npx cap add android
npx cap sync
```

### Passo 4: Configurar assinatura do APK

1. Gere uma keystore:
```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

2. Adicione ao `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('my-release-key.jks')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

3. Adicione os secrets no GitHub:
   - `KEYSTORE_PASSWORD`
   - `KEY_ALIAS`
   - `KEY_PASSWORD`
   - `KEYSTORE_BASE64` (keystore codificado em base64)

### Passo 5: Ativar o build Android no workflow

No arquivo `.github/workflows/deploy.yml`, descomente ou remova a linha:
```yaml
# if: false  # Desative temporariamente até configurar Capacitor
```

## 📦 Estrutura de Arquivos

Após configurar o Capacitor, sua estrutura deve ter:
```
projeto/
├── android/
│   ├── app/
│   │   └── build.gradle
│   └── build.gradle
├── dist/          # Build web
└── capacitor.config.ts
```

## 🔍 Troubleshooting

### Erro no deploy FTP:
- Verifique se as credenciais FTP estão corretas
- Confirme o caminho do servidor (`HOSTINGER_FTP_PATH`)
- Verifique se o servidor permite conexões FTP

### Erro no build Android:
- Certifique-se de que o Capacitor está configurado
- Verifique se o diretório `android/` existe
- Confirme que os secrets de assinatura estão configurados

### Build Android não executa:
- Verifique se removeu a linha `if: false` no workflow
- Confirme que o diretório `android/` foi criado pelo Capacitor

## 📝 Notas Importantes

1. **Build Web**: Sempre será executado e deployado na Hostinger
2. **Build Android**: Só funcionará após configurar o Capacitor
3. **Artefatos**: Os builds ficam disponíveis na aba **Actions** por 7-30 dias
4. **Releases**: Para criar releases com os APKs/AABs, crie uma tag no Git

## 🎯 Próximos Passos

1. Configure os secrets do GitHub
2. Teste o deploy web fazendo um push
3. (Opcional) Configure o Capacitor para builds Android
4. Ative o build Android no workflow


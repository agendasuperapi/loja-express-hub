# Exemplo de Configuração do Gradle para Assinatura

Este arquivo mostra como configurar a assinatura do APK no `android/app/build.gradle`.

## Configuração Completa

Adicione o seguinte código no arquivo `android/app/build.gradle`:

```gradle
android {
    ...
    
    signingConfigs {
        release {
            if (System.getenv("KEYSTORE_PASSWORD")) {
                storeFile file('my-release-key.jks')
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
    
    buildTypes {
        release {
            if (System.getenv("KEYSTORE_PASSWORD")) {
                signingConfig signingConfigs.release
            }
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Como Gerar o Keystore

### 1. Gerar o arquivo .jks

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

Você será solicitado a informar:
- Senha do keystore
- Nome e sobrenome
- Unidade organizacional
- Organização
- Cidade
- Estado
- Código do país

### 2. Converter para Base64

No **Linux/Mac**:
```bash
base64 -i my-release-key.jks | pbcopy  # Mac
base64 my-release-key.jks | xclip -selection clipboard  # Linux
```

No **Windows (PowerShell)**:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("my-release-key.jks"))
```

### 3. Adicionar ao GitHub Secrets

1. Vá em **Settings > Secrets and variables > Actions**
2. Adicione os seguintes secrets:
   - `KEYSTORE_BASE64` - O resultado do base64 do arquivo .jks
   - `KEYSTORE_PASSWORD` - A senha do keystore
   - `KEY_ALIAS` - O alias usado (ex: `my-key-alias`)
   - `KEY_PASSWORD` - A senha da chave (geralmente a mesma do keystore)

### 4. Adicionar o arquivo .jks ao .gitignore

**IMPORTANTE**: Nunca commite o arquivo `.jks` no repositório!

Adicione ao `.gitignore`:
```
*.jks
*.keystore
my-release-key.jks
```

## Estrutura Final

Seu `android/app/build.gradle` deve ter algo assim:

```gradle
android {
    namespace "com.seudominio.app"
    compileSdk 33

    defaultConfig {
        applicationId "com.seudominio.app"
        minSdk 22
        targetSdk 33
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            if (System.getenv("KEYSTORE_PASSWORD")) {
                storeFile file('my-release-key.jks')
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            if (System.getenv("KEYSTORE_PASSWORD")) {
                signingConfig signingConfigs.release
            }
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    ...
}
```

## Notas de Segurança

1. **Nunca commite o keystore**: Mantenha-o seguro e faça backup
2. **Use secrets do GitHub**: Nunca coloque senhas diretamente no código
3. **Backup**: Guarde uma cópia segura do keystore, pois você precisará dele para atualizações
4. **Perda do keystore**: Se perder o keystore, não poderá atualizar o app na Play Store


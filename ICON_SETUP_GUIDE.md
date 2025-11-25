# Guia de Configuração de Ícones do App Android

## Ícone Master Gerado

Foi gerado um ícone master em alta resolução (1024x1024) em: `src/assets/app-icon-master.png`

## Resoluções Necessárias para Android

Você precisa redimensionar o ícone master para as seguintes resoluções e colocá-las nos respectivos diretórios:

### Ícones Launcher Padrão (ic_launcher.png)
- **mdpi**: 48x48px → `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
- **hdpi**: 72x72px → `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- **xhdpi**: 96x96px → `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- **xxhdpi**: 144x144px → `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- **xxxhdpi**: 192x192px → `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

### Ícones Round (ic_launcher_round.png)
As mesmas resoluções acima, mas salvar como `ic_launcher_round.png` em cada diretório.

### Ícones Foreground para Adaptive Icons (ic_launcher_foreground.png)
Estes devem ter mais padding (safe zone) e fundo transparente:
- **mdpi**: 108x108px → `android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png`
- **hdpi**: 162x162px → `android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png`
- **xhdpi**: 216x216px → `android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png`
- **xxhdpi**: 324x324px → `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png`
- **xxxhdpi**: 432x432px → `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`

## Ferramentas Online Recomendadas

### 1. **Android Asset Studio** (Recomendado)
- URL: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
- Faça upload do ícone master (1024x1024)
- Escolha as opções de estilo
- Baixe o ZIP com todas as resoluções já organizadas
- Extraia e copie para a pasta `android/app/src/main/res/`

### 2. **App Icon Generator**
- URL: https://www.appicon.co/
- Faça upload do ícone master
- Selecione "Android"
- Baixe o pacote completo

### 3. **Icon Kitchen**
- URL: https://icon.kitchen/
- Upload do ícone
- Personalização avançada
- Export direto para estrutura Android

## Método Manual (usando qualquer editor de imagens)

Se preferir redimensionar manualmente:

1. Abra o `app-icon-master.png` no seu editor favorito (Photoshop, GIMP, Figma, etc.)
2. Para cada resolução:
   - Redimensione mantendo proporção
   - Exporte como PNG
   - Salve no diretório correto

### Exemplo usando ImageMagick (linha de comando):

```bash
# Instalar ImageMagick primeiro
# brew install imagemagick (Mac)
# sudo apt-get install imagemagick (Linux)

cd src/assets

# Gerar todos os tamanhos
convert app-icon-master.png -resize 48x48 ../../android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert app-icon-master.png -resize 72x72 ../../android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert app-icon-master.png -resize 96x96 ../../android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert app-icon-master.png -resize 144x144 ../../android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert app-icon-master.png -resize 192x192 ../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Copiar para round também
cp ../../android/app/src/main/res/mipmap-mdpi/ic_launcher.png ../../android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
cp ../../android/app/src/main/res/mipmap-hdpi/ic_launcher.png ../../android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
cp ../../android/app/src/main/res/mipmap-xhdpi/ic_launcher.png ../../android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
cp ../../android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png ../../android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
cp ../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png ../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
```

## Background Color para Adaptive Icon

O arquivo `android/app/src/main/res/values/ic_launcher_background.xml` já existe e define a cor de fundo do ícone adaptativo. Você pode personalizar a cor editando este arquivo:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FF6B35</color>
</resources>
```

## Verificação

Após copiar todos os ícones:

1. Execute `npx cap sync android`
2. Build o app: `cd android && ./gradlew assembleDebug`
3. Instale no device/emulador
4. Verifique se o ícone aparece corretamente na home screen

## Dicas

- **Safe Zone**: Para adaptive icons (foreground), mantenha o conteúdo importante dentro de um círculo central (66% do tamanho total)
- **Formato**: Sempre PNG com transparência quando necessário
- **Cores**: Use cores vibrantes que se destaquem na home screen
- **Teste**: Teste em diferentes launchers (Nova, Pixel, Samsung, etc.) pois cada um renderiza de forma diferente

## Próximos Passos

1. Use o Android Asset Studio (mais fácil)
2. Baixe o ZIP gerado
3. Extraia e copie as pastas mipmap-* para `android/app/src/main/res/`
4. Execute `npx cap sync android`
5. Faça o build e teste!

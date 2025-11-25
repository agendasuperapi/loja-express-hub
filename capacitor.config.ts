import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lojaexpress.app',
  appName: 'App Ofertas',
  webDir: 'dist',
  // IMPORTANTE: Comente o 'server' para produção
  // Descomente apenas para desenvolvimento com hot-reload
  // server: {
  //   url: 'https://d20c4f6b-951e-4c41-a56e-ef7ef21e7c50.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  android: {
    allowMixedContent: true
  }
};

export default config;

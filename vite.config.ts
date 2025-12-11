// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // *** 請修改這裡 ***
  base: '/HLTDL/', // 更改為您的倉庫名稱，並以斜線結尾
  
  define: {
    // ... 其他 define 設定 ...
    'process.env': {}
  },
  server: {
    // ... 其他 server 設定 ...
    host: '0.0.0.0',
    port: 8080,
  },
  preview: {
    // ... 其他 preview 設定 ...
    host: '0.0.0.0',
    port: 8080,
  }
});

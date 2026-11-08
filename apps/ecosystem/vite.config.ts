import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{host:'127.0.0.1'},build:{sourcemap:false,target:'es2022',rollupOptions:{output:{manualChunks(id){if(id.includes('/node_modules/@supabase/'))return 'auth-client';if(/\/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'react-runtime';}}}}});

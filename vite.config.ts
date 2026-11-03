import {defineConfig} from 'vite';
export default defineConfig({build:{outDir:'dist/client'},server:{host:'127.0.0.1',port:5174,proxy:{'/api':'http://127.0.0.1:3000','/realtime':{target:'ws://127.0.0.1:3000',ws:true}}}});

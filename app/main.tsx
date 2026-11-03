import React from 'react';import {createRoot} from 'react-dom/client';import Chat from './chat';import './globals.css';
try{document.documentElement.dataset.theme=localStorage.getItem('conversa-theme')||'dark'}catch{}
createRoot(document.getElementById('root')!).render(<Chat/>);
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});

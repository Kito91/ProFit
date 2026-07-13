import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { syncService } from './services/syncService';
import { notificationService } from './services/notificationService';
import './index.css'

syncService.initListener();
syncService.sync(); // Try to sync immediately on load
notificationService.initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

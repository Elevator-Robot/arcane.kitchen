import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { initFakeBackend, isFakeBackend } from './fake-backend';

const loadAmplifyOutputs = async () => {
  try {
    const response = await fetch('/amplify_outputs.json', {
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      console.warn('Amplify outputs are not available yet.');
      return null;
    }

    return response.json();
  } catch (error) {
    console.warn('Amplify outputs are not available yet.', error);
    return null;
  }
};

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const bootstrap = async () => {
  if (isFakeBackend()) {
    initFakeBackend();
  } else {
    const outputs = await loadAmplifyOutputs();

    if (outputs) {
      Amplify.configure(outputs);
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <div className="bg-arcane-parchment min-h-screen">
        <App />
      </div>
    </React.StrictMode>
  );
};

void bootstrap();

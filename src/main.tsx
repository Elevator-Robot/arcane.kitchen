import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { setCloudFrontDomain } from './amplifyConfig';


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

// Register Service Worker for PWA (production only). During dev the SW would
// cache Vite's unhashed module graph (`/node_modules/.vite/deps/*`) and serve
// stale chunks across optimize passes, causing duplicate module instances
// (e.g. "Invalid hook call: dispatcher is null").
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
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
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    // Purge caches left behind by a previously-registered dev SW. They can hold
    // stale/mangled copies of Vite's unhashed modules (e.g. the pre-router
    // RecipeBuilder.tsx) that break the running app even after unregistration.
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  }
}

const bootstrap = async () => {
  const outputs = await loadAmplifyOutputs();

  if (outputs) {
    Amplify.configure(outputs);
    setCloudFrontDomain(outputs?.custom?.CloudFrontDomain);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <div className="min-h-screen overflow-x-hidden">
          <App />
        </div>
      </BrowserRouter>
    </React.StrictMode>
  );
};

void bootstrap();

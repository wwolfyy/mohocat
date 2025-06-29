'use client';

import { useState } from 'react';
import { getMountainConfig, getFirebaseConfig, getYouTubeApiKey } from '@/utils/config';

export default function AdminTestPage() {
  const [testMessage, setTestMessage] = useState('Admin test page loaded successfully!');

  let configCheck = 'Loading...';
  let firebaseConfig = null;
  let youtubeApiKey = '';

  try {
    const config = getMountainConfig();
    firebaseConfig = getFirebaseConfig();
    youtubeApiKey = getYouTubeApiKey();
    configCheck = `✅ Config loaded for: ${config.name}`;
  } catch (error) {
    configCheck = `❌ Config error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h1 style={{ fontSize: '2rem', color: '#111827' }}>🐱 Admin Test</h1>
      <p style={{ color: '#6b7280' }}>{testMessage}</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => setTestMessage('Button click works!')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Button
        </button>
        <a
          href="/admin"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Go to Real Admin
        </a>
      </div>
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#111827' }}>Configuration System Check:</h3>
        <div style={{ textAlign: 'left', color: '#6b7280', marginBottom: '1rem' }}>{configCheck}</div>
        <ul style={{ textAlign: 'left', color: '#6b7280' }}>
          <li>Firebase API Key: {firebaseConfig?.apiKey ? '✅ Set' : '❌ Missing'}</li>
          <li>Firebase Project ID: {firebaseConfig?.projectId ? '✅ Set' : '❌ Missing'}</li>
          <li>YouTube API Key: {youtubeApiKey ? '✅ Set' : '❌ Missing'}</li>
          <li>Config Source: {process.env.MOUNTAIN_ID || process.env.NEXT_PUBLIC_MOUNTAIN_ID || 'geyang (default)'}</li>
        </ul>
      </div>
    </div>
  );
}

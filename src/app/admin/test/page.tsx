'use client';

import { useState } from 'react';

export default function AdminTestPage() {
  const [testMessage, setTestMessage] = useState('Admin test page loaded successfully!');

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
        <h3 style={{ marginBottom: '1rem', color: '#111827' }}>Environment Check:</h3>
        <ul style={{ textAlign: 'left', color: '#6b7280' }}>
          <li>Firebase API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing'}</li>
          <li>Firebase Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing'}</li>
          <li>YouTube API Key: {process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? '✅ Set' : '❌ Missing'}</li>
          <li>YouTube Channel ID: {process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ? '✅ Set' : '❌ Missing'}</li>
        </ul>
      </div>
    </div>
  );
}

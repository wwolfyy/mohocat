'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';

export default function CreateAdminUserPage() {
  const [email, setEmail] = useState('admin@mtcat.com');
  const [password, setPassword] = useState('admin123');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedEmails = [
    'admin@mtcat.com',
    'jp@mtcat.com',
    'admin@geyang-cats.com',
    'test@admin.com'
  ];

  const createTestUser = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setMessage(`✅ Test admin user created successfully!

📧 Email: ${email}
🔑 Password: ${password}

You can now log in to the admin interface using these credentials.`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setMessage(`⚠️ User already exists! You can log in with:

📧 Email: ${email}
🔑 Password: ${password}`);
      } else {
        setMessage(`❌ Error creating user: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setMessage('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage(`✅ Login test successful! Redirecting to admin dashboard...`);

      // Redirect to admin dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/admin';
      }, 2000);
    } catch (error: any) {
      setMessage(`❌ Login test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          🛠️ Create Test Admin User
        </h1>

        <p style={{
          color: '#6b7280',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Create a test admin user for development and testing purposes.
        </p>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <p style={{ color: '#92400e', margin: 0, fontSize: '0.9rem' }}>
            ⚠️ <strong>Development Only:</strong> This utility is for development/testing only.
            In production, admin users should be created through proper channels.
          </p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.25rem'
          }}>
            Admin Email
          </label>
          <select
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              backgroundColor: 'white'
            }}
          >
            {suggestedEmails.map(suggestedEmail => (
              <option key={suggestedEmail} value={suggestedEmail}>
                {suggestedEmail}
              </option>
            ))}
          </select>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Or enter custom email"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem',
              marginBottom: '0.5rem'
            }}
          />
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
            Must be one of the allowed admin emails in the config. Choose from dropdown or enter custom email.
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.25rem'
          }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem',
              marginBottom: '0.5rem'
            }}
          />
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
            Choose a secure password (minimum 6 characters)
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={createTestUser}
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: loading ? '#9ca3af' : '#10b981',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating...' : 'Create Admin User'}
          </button>

          <button
            onClick={testLogin}
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Testing...' : 'Test Login'}
          </button>
        </div>

        {message && (
          <div style={{
            backgroundColor: message.includes('✅') ? '#f0fdf4' :
                           message.includes('⚠️') ? '#fef3c7' : '#fef2f2',
            border: `1px solid ${
              message.includes('✅') ? '#bbf7d0' :
              message.includes('⚠️') ? '#f59e0b' : '#fecaca'
            }`,
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <pre style={{
              color: message.includes('✅') ? '#166534' :
                     message.includes('⚠️') ? '#92400e' : '#dc2626',
              margin: 0,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit'
            }}>
              {message}
            </pre>
          </div>
        )}

        <div style={{
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem',
          marginTop: '2rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Quick Setup Instructions:
          </h3>
          <ol style={{ color: '#6b7280', margin: 0, paddingLeft: '1.5rem' }}>
            <li>Click "Create Admin User" to create the test account</li>
            <li>Click "Test Login" to verify the account works</li>
            <li>Use the same credentials to log in to the admin interface</li>
            <li>Or go directly to <a href="/admin" style={{ color: '#3b82f6' }}>/admin</a> and log in</li>
          </ol>
        </div>

        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <a
            href="/admin"
            style={{
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            ← Go to Admin Login
          </a>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { seedDatabase } from '@/lib/admin/sampleData';

export default function SeedDataPage() {
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setMessage('');

    try {
      await seedDatabase();
      setMessage('✅ Database seeded successfully!');
    } catch (error: any) {
      setMessage(`❌ Error seeding database: ${error.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1rem'
      }}>
        🌱 Database Seeding
      </h1>

      <p style={{
        color: '#6b7280',
        marginBottom: '2rem'
      }}>
        This page allows you to populate the Firebase database with sample cat data for testing the admin interface.
      </p>

      <div style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <p style={{ color: '#92400e', margin: 0 }}>
          ⚠️ <strong>Warning:</strong> This will add sample data to your Firebase database.
          Only use this in development/testing environments.
        </p>
      </div>

      <button
        onClick={handleSeedDatabase}
        disabled={seeding}
        style={{
          backgroundColor: seeding ? '#9ca3af' : '#10b981',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: seeding ? 'not-allowed' : 'pointer',
          marginBottom: '1rem'
        }}
      >
        {seeding ? 'Seeding Database...' : 'Seed Database'}
      </button>

      {message && (
        <div style={{
          backgroundColor: message.includes('✅') ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.includes('✅') ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <p style={{
            color: message.includes('✅') ? '#166534' : '#dc2626',
            margin: 0
          }}>
            {message}
          </p>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        marginTop: '2rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
          Sample Data Includes:
        </h3>
        <ul style={{ color: '#6b7280', margin: 0, paddingLeft: '1.5rem' }}>
          <li>3 sample cat images (개똥이, 꽃분이, 누렁이)</li>
          <li>2 sample videos with mountain cats</li>
          <li>3 cat profiles with detailed information</li>
          <li>Tagged and categorized content</li>
        </ul>
      </div>

      <div style={{
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <a
          href="/admin"
          style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}
        >
          ← Back to Admin Dashboard
        </a>
      </div>
    </div>
  );
}

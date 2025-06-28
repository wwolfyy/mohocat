'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import AdminAuth from '@/components/admin/AdminAuth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Bypass authentication for the create-user utility page
  if (pathname === '/admin/create-user') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        {children}
      </div>
    );
  }

  return (
    <AdminAuth>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        {/* Admin Navigation Bar */}
        <header style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <a href="/admin" style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#111827',
                textDecoration: 'none'
              }}>
                🐱 Admin
              </a>
              <nav style={{ display: 'flex', gap: '1rem' }}>
                <a href="/admin" style={{
                  padding: '0.5rem 1rem',
                  color: '#6b7280',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}>
                  Dashboard
                </a>
                <a href="/admin/tag-images-new" style={{
                  padding: '0.5rem 1rem',
                  color: '#6b7280',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}>
                  Tag Images
                </a>
                <a href="/admin/tag-videos-new" style={{
                  padding: '0.5rem 1rem',
                  color: '#6b7280',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}>
                  Tag Videos
                </a>
              </nav>            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <a href="/" style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}>
                ← Back to Site
              </a>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>
    </AdminAuth>
  );
}

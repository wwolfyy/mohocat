'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoginForm from '@/components/LoginForm';

const LoginPage = () => {
  const router = useRouter();

  useEffect(() => {
    const handleLoginSuccess = () => {
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
      router.push(redirectUrl || '/');
    };

    // Assuming LoginForm emits a custom event on successful login
    window.addEventListener('loginSuccess', handleLoginSuccess);

    return () => {
      window.removeEventListener('loginSuccess', handleLoginSuccess);
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-full max-w-md p-4 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;

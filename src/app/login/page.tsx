'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import LoginForm from '@/components/LoginForm';
import SignupForm from '@/components/SignupForm';
import { cn } from '@/utils/cn';
import { useSearchParams, useRouter } from 'next/navigation';

export default function LoginPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';

    // We lift state up, but also sync with URL if desired, or just simple state.
    // Syncing with URL is good for deep linking.
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

    // Update tab if URL changes (e.g. back button)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'signup' || tab === 'login') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (tab: 'login' | 'signup') => {
        setActiveTab(tab);
        // Optional: Update URL without full reload (shallow routing not fully explicit in next 13+ app dir same way)
        // clean way: router.replace or push
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('tab', tab);
        router.replace(`?${newParams.toString()}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Logo or Title could go here */}
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {activeTab === 'login' ? 'Sign in to your account' : 'Create a new account'}
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => handleTabChange('login')}
                            className={cn(
                                "flex-1 py-4 text-center text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'login'
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => handleTabChange('signup')}
                            className={cn(
                                "flex-1 py-4 text-center text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'signup'
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {activeTab === 'login' ? (
                            <LoginForm onSwitchToSignup={() => handleTabChange('signup')} />
                        ) : (
                            <SignupForm />
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

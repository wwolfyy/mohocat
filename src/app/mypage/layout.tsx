import { redirect } from 'next/navigation';

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-sm relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-center text-gray-900">My Page</h1>
        </header>

        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}

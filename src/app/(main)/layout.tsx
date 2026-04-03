import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <BottomNav />
    </>
  );
}

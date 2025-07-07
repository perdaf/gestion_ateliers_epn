import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/navbar';
import { ToastProvider } from '@/components/ui/toast-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gestion des Ateliers EPN',
  description: 'Application de gestion des ateliers pour Espace Public Numérique',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gray-100`}>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
        <ToastProvider />
      </body>
    </html>
  );
}

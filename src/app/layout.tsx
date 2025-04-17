import './globals.css';
import type { Metadata } from 'next';
// import ReownProvider from '@/context/ReownProvider';
import ContextProvider from '@/context';

export const metadata: Metadata = {
  title: 'Nadxel App',
  description: 'Nadxel Web3 App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // const headersObj = await headers();
  // const cookies = headersObj.get('cookie');
  
  return (
    <html lang="en">
      <body>
        <ContextProvider >{children}</ContextProvider>
      </body>
    </html>
  );
}
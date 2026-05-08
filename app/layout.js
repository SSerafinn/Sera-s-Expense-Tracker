import './globals.css';

export const metadata = {
  title: "Seraf's Personal Tracker",
  description: 'A modern personal finance tracker',
};

import { StateProvider } from '@/components/StateContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StateProvider>
          {children}
        </StateProvider>
      </body>
    </html>
  );
}

"use client";
import { useEffect, useState } from 'react';
import { useStateContext } from '@/components/StateContext';
import Auth from '@/components/Auth';
import DashboardLayout from '@/components/DashboardLayout';

export default function Home() {
  const { token, user } = useStateContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    // Dark mode toggle logic based on localStorage could go here
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  if (!mounted) return null;

  return (
    <>
      {!token ? (
        <Auth />
      ) : (
        <DashboardLayout />
      )}
    </>
  );
}

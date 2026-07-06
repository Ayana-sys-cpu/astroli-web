'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import Store from '@/components/Store';

export default function StorePage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/store/state').then(r => {
      if (r.status === 401) router.replace('/dev-login');
    }).catch(() => {});
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={80} seed={42} />
      <TopBar />

      <div className="flex flex-1 flex-col pt-14 overflow-hidden">
        <Store />
      </div>
    </motion.div>
  );
}

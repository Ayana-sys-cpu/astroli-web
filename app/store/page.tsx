'use client';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import TopBar from '@/components/TopBar';
import Store from '@/components/Store';

export default function StorePage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col"
    >
      <StarField count={80} seed={42} />
      <TopBar />

      <div className="flex flex-1 items-start justify-center pt-20 pb-10 px-6">
        <Store />
      </div>
    </motion.div>
  );
}

'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import StudentHeader from '@/components/StudentHeader';
import Store from '@/components/Store';
import { resolveStoreOrigin } from '@/lib/store-origin';
import { t } from '@/lib/i18n';

function StorePageContent() {
  const params = useSearchParams();
  // Where the student came from, carried in the URL so a refresh keeps it.
  const origin = resolveStoreOrigin({
    from: params.get('from'),
    label: params.get('label'),
    lang: params.get('lang'),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-[100dvh] bg-black overflow-hidden flex flex-col"
    >
      <StarField count={80} seed={42} />

      <StudentHeader
        back={{ label: origin.label, href: origin.href }}
        context={t('storeLabel', origin.lang)}
        store="readonly"
        lang={origin.lang}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Store />
      </div>
    </motion.div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={null}>
      <StorePageContent />
    </Suspense>
  );
}

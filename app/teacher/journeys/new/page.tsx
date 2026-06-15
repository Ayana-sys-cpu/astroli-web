'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCourses, type CourseRecord } from '@/lib/teacher-store';
import ConnectState from '@/components/teacher/ConnectState';

export default function NewJourneyPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRecord[]>([]);

  useEffect(() => {
    setCourses(getCourses());
  }, []);

  function handleConnected() {
    router.push('/teacher/journeys');
  }

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-space font-black" style={{ fontSize: 26, letterSpacing: '0.12em', color: '#1a1a2e' }}>
          NEW JOURNEY
        </h1>
        <p className="font-inter" style={{ fontSize: 11, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.04em', marginTop: 6 }}>
          Connect a classroom and select a curriculum to get started
        </p>
      </div>
      <ConnectState courses={courses} onConnected={handleConnected} />
    </div>
  );
}

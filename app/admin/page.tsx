// /admin — entry point of the Pilot Review Dashboard; the roster is home.
// The original Family Track Monitor now lives at /admin/families.

import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  redirect('/admin/students');
}

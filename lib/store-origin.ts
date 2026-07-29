import { isBackLabelKey, isLang, type BackLabelKey, type Lang } from '@/lib/i18n';

export interface StoreOrigin {
  label: BackLabelKey;
  href: string;
  lang: Lang;
}

const HOME: Pick<StoreOrigin, 'label' | 'href'> = { label: 'backHome', href: '/home' };

/**
 * An origin is only usable if it is an internal path. Anything else — an
 * absolute URL, a protocol-relative `//host`, a backslash variant — would turn
 * the store's back button into an open redirect off the platform.
 */
function isInternalPath(value: string | null): value is string {
  if (!value || value[0] !== '/') return false;
  return value[1] !== '/' && value[1] !== '\\';
}

/**
 * Resolves the store's back control from its query string. `href` and `label`
 * are validated together: a bad path falls back to Home for both, so the label
 * can never name a destination the student is not actually sent to.
 */
export function resolveStoreOrigin(params: {
  from: string | null;
  label: string | null;
  lang: string | null;
}): StoreOrigin {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en';

  if (!isInternalPath(params.from) || !isBackLabelKey(params.label)) {
    return { ...HOME, lang };
  }

  return { label: params.label, href: params.from, lang };
}

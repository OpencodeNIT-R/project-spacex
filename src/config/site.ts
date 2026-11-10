/**
 * The site's public identity: one canonical origin and the copy shared by metadata, robots.txt, sitemap.xml,
 * structured data and the Google sign-in return address.
 *
 * Canonical URLs are always built from SITE_URL, never from the request's Host header, so a preview deployment, a
 * per-deployment vercel.app URL or a spoofed Host never becomes the canonical address.
 */

// The production address. The www host is the primary one: innonitrkl.com (the apex) 308-redirects to it on Vercel.
// Every canonical URL, og:url, robots.txt, sitemap.xml and JSON-LD URL follows it. NEXT_PUBLIC_SITE_URL overrides it.
const DEFAULT_SITE_URL = 'https://www.innonitrkl.com';

/** Origin of NEXT_PUBLIC_SITE_URL (no trailing slash), or the default if it is unset or not an http(s) URL. */
function siteOrigin(value: string | undefined): string {
  try {
    const url = value ? new URL(value) : null;
    if (url && (url.protocol === 'https:' || url.protocol === 'http:')) return url.origin;
  } catch {}
  return DEFAULT_SITE_URL;
}

/**
 * Canonical origin. Google sign-in returns here too, so it must be listed under Supabase -> Authentication ->
 * URL Configuration.
 */
export const SITE_URL = siteOrigin(process.env.NEXT_PUBLIC_SITE_URL);

/** The official brand name, exactly as it is written: og:site_name, the app name and the home page title. */
export const SITE_NAME = 'INNOVISION 2026 | NIT ROURKELA';
export const EVENT_DATE = { label: '13 NOV 2026', display: '13 November 2026' } as const;

/** Rourkela city coordinates (22°12′ N, 84°54′ E), used as a venue-city imprint.
 * Source: https://nitrkl.ac.in/docs/PlacementBrochure/09082017164608850.pdf */
export const VENUE_CITY = { latitude: 22.2, longitude: 84.9, imprint: '22°12′ N · 84°54′ E' } as const;

/** Home page title. Other pages use the "%s – INNOVISION 2026 | NIT ROURKELA" template from the root layout. */
export const SITE_TITLE = SITE_NAME;

/** The fest's official social profiles (the footer's links), for the Organization's sameAs in structured data. */
export const SOCIAL_PROFILES = [
  'https://www.instagram.com/inno.nitr_official/',
  'https://www.linkedin.com/company/innovision-nitrkl/',
];

export const SITE_DESCRIPTION =
  "Official website of INNOVISION 2026 by NIT Rourkela, Eastern India's largest techno-management fest. Explore the Flagship, Standout, Main, and DTS and Fun Events.";

/** Official WhatsApp group for confirmed attendees (the "Before you visit" card on MY PASS). */
export const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/ISNec5MRzMD3RTUPaT9Wqx';

/**
 * The No Objection Certificate confirmed participants download, print, fill, sign (with a parent) and bring as a hard
 * copy to the venue (MY PASS, under the ticket). The file lives in public/forms, not public/assets: /assets is cached
 * for a week (next.config.ts), so a form swapped under the same name there could stay stale.
 */
export const NOC_FORM = {
  title: 'INNOVISION 2026 No Objection Certificate',
  href: '/forms/innovision-2026-noc.pdf',
  fileName: 'INNOVISION-2026-NOC.pdf',
} as const;

/** General guidelines for participants (entry, verification, accommodation, contacts, conduct), also under the ticket. */
export const GUIDELINES_PDF = {
  title: 'INNOVISION 2026 General Guidelines',
  href: '/forms/innovision-2026-guidelines.pdf',
  fileName: 'INNOVISION-2026-General-Guidelines.pdf',
} as const;

/**
 * Whether search engines may index this deployment. Only Vercel's production deployment is indexable: preview and
 * development deployments get `noindex` and a robots.txt that disallows everything, so they never compete with the
 * official site. Outside Vercel (VERCEL_ENV unset, e.g. a local `next start`) the build is treated as production.
 * Server-only: VERCEL_ENV is not exposed to the browser.
 */
export const INDEXABLE = (process.env.VERCEL_ENV ?? 'production') === 'production';

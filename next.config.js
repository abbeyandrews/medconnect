/** @type {import('next').NextConfig} */

/**
 * Sent on every response. Next adds none of these itself, and this app renders
 * patient names and phone numbers, so they are worth having:
 *   - nosniff        stops a response being reinterpreted as another type
 *   - frame DENY     the app can never be framed, so no clickjacking
 *   - referrer       a patient id in a URL never leaks to another origin
 *   - permissions    revokes APIs this app has no use for
 * HSTS is deliberately absent: it belongs on the TLS terminator in front,
 * which is the only thing that knows whether HTTPS is actually available.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  reactStrictMode: true,
  // The API URL is the one thing that differs per deployment.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  // Do not advertise the framework version to anyone scanning.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;

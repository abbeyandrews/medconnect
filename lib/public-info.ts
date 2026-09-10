'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * The short code patients dial, read from system settings.
 *
 * It lives in one place so the front page, the USSD test console, the SMS
 * messages and the USSD help screen can never disagree. The server already
 * reads it from settings for the last two; this is how the browser gets it.
 *
 * A hospital issued a different code changes it once, in Admin → Settings,
 * and every channel follows.
 */

/** Shown until the API answers, and if it cannot be reached at all. */
export const FALLBACK_USSD_CODE = '*920*131#';

export type PublicInfo = {
  hospitalName: string;
  ussdServiceCode: string;
};

export function usePublicInfo() {
  const [info, setInfo] = useState<PublicInfo>({
    hospitalName: 'MedConnect',
    ussdServiceCode: FALLBACK_USSD_CODE,
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get<PublicInfo>('/public/info')
      .then((next) => {
        if (cancelled || !next?.ussdServiceCode) return;
        setInfo({
          hospitalName: next.hospitalName || 'MedConnect',
          ussdServiceCode: next.ussdServiceCode,
        });
      })
      .catch(() => {
        // These screens must render whether or not the API is awake.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

/** Just the code, for the many callers that need nothing else. */
export function useUssdCode() {
  return usePublicInfo().ussdServiceCode;
}

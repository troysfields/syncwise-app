'use client';

import { useState, useEffect } from 'react';

// Wrapper that only renders children after client hydration
// Prevents React #418 errors for time-dependent content
export function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children : fallback;
}

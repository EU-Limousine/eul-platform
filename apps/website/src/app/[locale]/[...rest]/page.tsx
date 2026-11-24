import { notFound } from 'next/navigation';

/** Any unknown path under a language (/en/xyz) shows the localised 404 page (not-found.tsx). */
export default function CatchAll(): never {
  notFound();
}

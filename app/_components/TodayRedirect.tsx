"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { todayLocal } from "@/lib/date";

/**
 * The server cannot know the visitor's local calendar day, so it never guesses
 * one. When `?date=` is missing or malformed, the page renders this instead and
 * the client puts its own local day into the URL. From then on the server only
 * ever renders the day it was explicitly given — no hydration mismatch, and no
 * entry can drift across a timezone boundary.
 */
export default function TodayRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/?date=${todayLocal()}`);
  }, [router]);

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <p className="text-sm text-pine-soft">Opening today&rsquo;s day…</p>
    </div>
  );
}

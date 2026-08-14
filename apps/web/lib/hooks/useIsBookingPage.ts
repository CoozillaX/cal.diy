import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { usePathname } from "next/navigation";
// TODO: This approach of checking booking page isn't correct.
// app.cal.com/rick is a booking page but useIsBookingPage won't return true. This is because all unregistered router in Next.js could technically be a booking page throw catch all routes.
// The only way to confirm it is by actually checking if we actually rendered a booking route.
export default function useIsBookingPage(): boolean {
  const pathname = usePathname();
  // Match the segment exactly, or followed by "/" - a plain startsWith lets a plural sibling route
  // (e.g. the internal /teams list) falsely match its singular booking-page prefix (/team), which
  // flips ThemeProvider's storageKey/key on navigation into it and forces a client-only remount of
  // next-themes' internal FOUC script (React 19's "encountered a script tag" warning).
  const isBookingPage = [
    "/booking",
    "/cancel",
    "/reschedule",
    "/instant-meeting", // Instant booking page
    "/team", // Team booking pages
    "/d", // Private Link of booking page
    "/router", // Headless router page - Loads as a page when redirect type is customPageMessage
  ].some((route) => pathname === route || pathname?.startsWith(`${route}/`));
  const isBookingsListPage = ["/upcoming", "/unconfirmed", "/recurring", "/cancelled", "/past"].some(
    (route) => pathname?.endsWith(route)
  );

  const searchParams = useCompatSearchParams();
  const isUserBookingPage = Boolean(searchParams?.get("user"));
  const isUserBookingTypePage = Boolean(searchParams?.get("user") && searchParams?.get("type"));

  return (isBookingPage && !isBookingsListPage) || isUserBookingPage || isUserBookingTypePage;
}

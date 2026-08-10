import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import type { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import { getHideBranding } from "@calcom/features/profile/lib/hideBranding";
import { TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import slugify from "@calcom/lib/slugify";
import { RedirectType } from "@calcom/prisma/enums";
import { handleOrgRedirect } from "@lib/handleOrgRedirect";
import { processReschedule, processSeatedEvent } from "@server/lib/[user]/[type]/getServerSideProps";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

type Props = {
  eventData: NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;
  booking?: GetBookingType;
  rescheduleUid: string | null;
  bookingUid: string | null;
  user: string;
  slug: string;
  isBrandingHidden: boolean;
  isSEOIndexable: boolean | null;
  themeBasis: null | string;
  orgBannerUrl: null;
};

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession({ req: context.req });
  const { slug: teamSlug, type: eventSlug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid } = context.query;
  const allowRescheduleForCancelledBooking = context.query.allowRescheduleForCancelledBooking === "true";

  const redirect = await handleOrgRedirect({
    slugs: [teamSlug],
    redirectType: RedirectType.Team,
    eventTypeSlug: eventSlug,
    context,
    currentOrgDomain: null,
  });

  if (redirect) {
    return redirect;
  }

  const teamRepository = new TeamRepository();
  const team = await teamRepository.findBySlug({ slug: teamSlug });

  if (!team) {
    return {
      notFound: true,
    } as const;
  }

  // We use this to both prefetch the query on the server, as well as to check if the
  // event exists, so we can show a 404 otherwise.
  const eventData = await EventRepository.getPublicEvent(
    {
      username: teamSlug,
      eventSlug,
      isTeamEvent: true,
      org: null,
      fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
    },
    session?.user?.id
  );

  if (!eventData) {
    return {
      notFound: true,
    } as const;
  }

  const props: Props = {
    eventData,
    user: teamSlug,
    slug: eventSlug,
    isBrandingHidden: await getHideBranding({ teamId: team.id }),
    isSEOIndexable: true,
    themeBasis: null,
    bookingUid: bookingUid ? `${bookingUid}` : null,
    rescheduleUid: null,
    orgBannerUrl: null,
  };

  if (rescheduleUid) {
    const processRescheduleResult = await processReschedule({
      props,
      rescheduleUid,
      session,
      allowRescheduleForCancelledBooking,
    });
    if (processRescheduleResult) {
      return processRescheduleResult;
    }
  } else if (bookingUid) {
    const processSeatResult = await processSeatedEvent({
      props,
      bookingUid,
      allowRescheduleForCancelledBooking,
    });
    if (processSeatResult) {
      return processSeatResult;
    }
  }

  return {
    props,
  };
};

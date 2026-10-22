import { ComingSoon } from "@/components/coming-soon/ComingSoon";
import { sectionMetadata } from "@/app/_lib/sectionMetadata";

export const metadata = sectionMetadata({
  title: "Events",
  description: "Events for AAYAM 2026 at NIT Agartala — coming soon.",
  path: "/events",
});

export default function EventsPage() {
  return <ComingSoon sectionName="Events" />;
}

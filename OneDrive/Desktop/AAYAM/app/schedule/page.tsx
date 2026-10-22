import { ComingSoon } from "@/components/coming-soon/ComingSoon";
import { sectionMetadata } from "@/app/_lib/sectionMetadata";

export const metadata = sectionMetadata({
  title: "Schedule",
  description: "The AAYAM 2026 schedule (13–15 November, NIT Agartala) — coming soon.",
  path: "/schedule",
});

export default function SchedulePage() {
  return <ComingSoon sectionName="Schedule" />;
}

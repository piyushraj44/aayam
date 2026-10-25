import { ComingSoon } from "@/components/coming-soon/ComingSoon";
import { sectionMetadata } from "@/app/_lib/sectionMetadata";

export const metadata = sectionMetadata({
  title: "Timeline",
  description: "The AAYAM 2026 timeline at NIT Agartala — coming soon.",
  path: "/timeline",
});

export default function TimelinePage() {
  return <ComingSoon sectionName="Timeline" />;
}

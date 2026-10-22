import { ComingSoon } from "@/components/coming-soon/ComingSoon";
import { sectionMetadata } from "@/app/_lib/sectionMetadata";

export const metadata = sectionMetadata({
  title: "Our Team",
  description: "The team behind AAYAM 2026 at NIT Agartala — coming soon.",
  path: "/team",
});

export default function TeamPage() {
  return <ComingSoon sectionName="Our Team" />;
}

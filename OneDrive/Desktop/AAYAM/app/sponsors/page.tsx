import { ComingSoon } from "@/components/coming-soon/ComingSoon";
import { sectionMetadata } from "@/app/_lib/sectionMetadata";

export const metadata = sectionMetadata({
  title: "Sponsors",
  description: "Sponsors of AAYAM 2026 at NIT Agartala — coming soon.",
  path: "/sponsors",
});

export default function SponsorsPage() {
  return <ComingSoon sectionName="Sponsors" />;
}

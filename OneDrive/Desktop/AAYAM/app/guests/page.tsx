import { ComingSoon } from "@/components/coming-soon/ComingSoon";
import { sectionMetadata } from "@/app/_lib/sectionMetadata";

export const metadata = sectionMetadata({
  title: "Guests",
  description: "Guests at AAYAM 2026, NIT Agartala — coming soon.",
  path: "/guests",
});

export default function GuestsPage() {
  return <ComingSoon sectionName="Guests" />;
}

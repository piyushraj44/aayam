import { ComingSoon } from "@/components/coming-soon/ComingSoon";
import { sectionMetadata } from "@/app/_lib/sectionMetadata";

export const metadata = sectionMetadata({
  title: "About",
  description: "About AAYAM 2026, the annual technical fest of NIT Agartala — coming soon.",
  path: "/about",
});

export default function AboutPage() {
  return <ComingSoon sectionName="About" />;
}

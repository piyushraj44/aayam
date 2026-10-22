import { navItems } from "@/content/site";
import { StatusScreen } from "./StatusScreen";

export type ComingSoonProps = {
  sectionName: string;
  description?: string;
};

const DEFAULT_DESCRIPTION = "This section is being prepared. Check back soon.";

/**
 * Shared placeholder for every section that isn't ready yet. When a section
 * launches, replace <ComingSoon /> in app/<route>/page.tsx with real content
 * and set `ready: true` for it in content/site.ts.
 */
export function ComingSoon({ sectionName, description = DEFAULT_DESCRIPTION }: ComingSoonProps) {
  const position = navItems.findIndex(
    (item) => item.label.toLowerCase() === sectionName.toLowerCase(),
  );
  const index = position >= 0 ? String(position + 1).padStart(2, "0") : undefined;
  const total = String(navItems.length).padStart(2, "0");

  return (
    <StatusScreen
      eyebrow={sectionName}
      index={index}
      marker={index ? `${index} / ${total}` : undefined}
      display="Coming soon"
      description={description}
    />
  );
}

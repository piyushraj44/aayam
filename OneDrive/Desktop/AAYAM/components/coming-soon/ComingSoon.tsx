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
  return <StatusScreen eyebrow={sectionName} display="Coming soon" description={description} />;
}

import type { Metadata } from "next";
import { StatusScreen } from "@/components/coming-soon/StatusScreen";

/** Next.js adds `<meta name="robots" content="noindex">` to 404 responses itself. */
export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist on the AAYAM 2026 website.",
};

export default function NotFound() {
  return (
    <StatusScreen
      eyebrow="Page not found"
      marker="Error 404"
      display="404"
      outlined
      description="This page doesn't exist."
    />
  );
}

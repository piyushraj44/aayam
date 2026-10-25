import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/content/site";
import { OG_IMAGE } from "@/app/_lib/sectionMetadata";

export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";
export const dynamic = "force-static";

/* Values mirror the tokens in app/globals.css (CSS variables aren't available to next/og). */
const VOID_BLACK = "#050608";
const CHROME_WHITE = "#f2f4f7";
const LINE = "rgba(174, 181, 190, 0.22)";

const WORDMARK_W = 1712;
const WORDMARK_H = 604;

export default async function OpengraphImage() {
  // Read the molten wordmark from disk so the image builds without network access.
  const png = await readFile(join(process.cwd(), "public/images/brand/aayam-wordmark@2x.png"));
  const wordmark = `data:image/png;base64,${png.toString("base64")}`;
  const width = 820;
  const height = Math.round((width * WORDMARK_H) / WORDMARK_W);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: VOID_BLACK,
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 50% 42%, rgba(194, 24, 91, 0.16), rgba(5, 6, 8, 0) 70%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 32,
            right: 32,
            bottom: 32,
            border: `1px solid ${LINE}`,
            display: "flex",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
        <img src={wordmark} width={width} height={height} alt="" />
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 34,
            letterSpacing: 8,
            color: CHROME_WHITE,
            textTransform: "uppercase",
          }}
        >
          {`${site.institute} · ${site.dateStatus}`}
        </div>
      </div>
    ),
    size,
  );
}

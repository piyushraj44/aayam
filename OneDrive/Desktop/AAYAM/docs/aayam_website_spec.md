# AAYAM — Technoir Website Design & Development Specification

**Project:** Upcoming technical festival website, National Institute of Technology Agartala  
**Working identity:** AAYAM  
**Visual direction:** Technoir × Chrome White × Liquid Metal  
**Document type:** Product, design, frontend and launch brief  
**Status:** Initial specification; event information is not final yet  
**Content state:** Keep unfinished sections marked **COMING SOON** until the organisers approve their content.

---

## Contents

1. [Project vision](#1-project-vision)
2. [Reference images and their intended use](#2-reference-images-and-their-intended-use)
3. [Design principles and colour system](#3-design-principles-and-colour-system)
4. [Landing page: exact experience](#4-landing-page-exact-experience)
5. [Cursor-responsive liquid-chrome object](#5-cursor-responsive-liquid-chrome-object)
6. [Navigation menu](#6-navigation-menu)
7. [Page-by-page requirements](#7-page-by-page-requirements)
8. [Coming Soon state](#8-coming-soon-state)
9. [Interaction and motion specification](#9-interaction-and-motion-specification)
10. [Frontend architecture and recommended stack](#10-frontend-architecture-and-recommended-stack)
11. [Content model and external redirects](#11-content-model-and-external-redirects)
12. [Performance, accessibility and responsive behaviour](#12-performance-accessibility-and-responsive-behaviour)
13. [SEO, sharing and analytics](#13-seo-sharing-and-analytics)
14. [Security and operational requirements](#14-security-and-operational-requirements)
15. [Suggested project structure](#15-suggested-project-structure)
16. [Development phases](#16-development-phases)
17. [Testing and acceptance criteria](#17-testing-and-acceptance-criteria)
18. [Information required from the organisers](#18-information-required-from-the-organisers)
19. [Optional future enhancements](#19-optional-future-enhancements)
20. [External design references](#20-external-design-references)

---

## 1. Project vision

Build a visually distinctive, mobile-first website for the upcoming techfest at NIT Agartala. The website should feel cinematic, futuristic, minimal and premium. The visual identity is a contrast between:

- A **sculptural AAYAM wordmark** with red, magenta, orange and restrained gold reflections, matching Reference Image 1.
- A **3D liquid-chrome object** with cool white/silver reflections, matching Reference Image 2.
- A deep-black Technoir environment with digital texture, carefully controlled light, and generous negative space.

This should not look like a generic event template. The hero is the visual signature; the rest of the site should be clear, consistent and useful.

### Primary goals

1. Make the AAYAM identity immediately memorable.
2. Deliver a polished landing page with a responsive chrome object.
3. Make the seven top-level destinations easy to find.
4. Prepare all primary sections even while content is pending.
5. Redirect visitors to official event registration pages once those links are confirmed.
6. Keep the first release lightweight and avoid unnecessary backend development.

### Non-goals for the first release

- Building a custom registration or payment system.
- Creating participant accounts or a login portal.
- Storing participant data without a defined need and approved process.
- Building a complex admin dashboard for content that can initially be maintained in static files.
- Adding heavy 3D effects that make the site slow on mobile devices.

---

## 2. Reference images and their intended use

The reference assets are included beside this Markdown file in the `aayam_website_spec_assets/` directory. Keep the files together if sharing the specification as a folder. A ZIP bundle is also useful when passing the brief to the development team.

### Reference Image 1 — AAYAM wordmark

![AAYAM wordmark reference](aayam_website_spec_assets/aayam-wordmark-reference.jpg)

**Use this as the direction for the AAYAM title on the landing page.** Preserve its unusual sculptural lettering and molten red/magenta/orange/gold appearance. It should remain the dominant identity element and should not be replaced by a generic typed heading unless an editable logo asset is supplied by the design team.

The digital/pixelated figure or texture behind the wordmark can inform the background atmosphere. Keep it subtle enough that the wordmark remains legible.

### Reference Image 2 — Liquid-chrome object

![Liquid chrome orb reference](aayam_website_spec_assets/liquid-chrome-orb-reference.jpg)

**Use this as the material and hover-state reference for the interactive object.** The object should look like polished, reflective liquid metal with cool silver-white highlights and black mirrored reflections. Aim for smooth, organic, sculptural geometry rather than a flat silver circle or a simple gradient.

The reference should guide the material, lighting and silhouette; it does not need to be duplicated pixel-for-pixel.

### How the two references work together

The AAYAM wordmark provides colour and identity. The chrome object provides movement and interaction. Do not turn the full page into a red/orange interface: reserve those colours primarily for the wordmark. The rest of the interface should remain monochrome, using black, gunmetal, silver and chrome white.

---

## 3. Design principles and colour system

### 3.1 Colour tokens

| Token | Suggested value | Use |
|---|---|---|
| `void-black` | `#050608` | Main background |
| `deep-black` | `#000000` | Hero backdrop and high-contrast areas |
| `obsidian` | `#101216` | Panels, menu background and overlays |
| `gunmetal` | `#292D33` | Dividers, surfaces and secondary panels |
| `steel-grey` | `#727B86` | Secondary text and muted iconography |
| `liquid-silver` | `#AEB5BE` | Borders, secondary chrome accents |
| `chrome-white` | `#F2F4F7` | Main text, focus indicators and highlights |
| `wordmark-magenta` | Derived from the supplied wordmark | Wordmark only; sample exact colour from the final artwork |
| `wordmark-orange` | Derived from the supplied wordmark | Wordmark only; sample exact colour from the final artwork |

Use approximately **70% dark surfaces, 20% silver/grey and 10% bright highlights** as an initial visual guide, not a rigid rule. The wordmark's warmer tones are a separate identity accent.

### 3.2 Surface and material language

- Black surfaces should be clean and deep rather than covered in noisy textures.
- Chrome needs convincing highlights, dark reflections and smooth material transitions.
- Metallic borders should be thin and restrained.
- Use subtle grain, scanlines, digital pixels or technical grids only as background detail.
- Avoid large, frequent glow effects; the design should feel reflective rather than neon.
- Use strong spacing and alignment so the interface remains premium and readable.

### 3.3 Typography

- Use a distinctive display face for the hero only if it complements the supplied AAYAM artwork.
- Use a clean sans-serif for body content and controls.
- A condensed uppercase face can be used for navigation labels, inspired by the supplied menu reference.
- Keep headings short and letter spacing controlled. Avoid making every item uppercase if it reduces readability.
- The logo/wordmark should be treated as artwork, not recreated using an arbitrary font.

### 3.4 Shared components

Create reusable components for:

- Header and navigation overlay.
- Primary and secondary buttons.
- Section heading and eyebrow label.
- Coming Soon panel.
- Event card and category label.
- Sponsor logo tile.
- Schedule item.
- Footer.
- Loading and reduced-motion fallbacks for visual effects.

---

## 4. Landing page: exact experience

The Home page is the fully designed landing page. It should not show a generic “Coming Soon” screen. The other sections can show Coming Soon until the content is approved.

### 4.1 First viewport layout

1. **Background:** near-black, full viewport, minimal texture.
2. **Branding:** AAYAM wordmark as shown in Reference Image 1, centred or compositionally placed as the main focal point.
3. **Atmosphere:** a subdued digital/pixelated form or vertical data-like texture behind the wordmark, where it works with the final logo asset.
4. **Interactive object:** a 3D liquid-chrome object using Reference Image 2 as its material direction. It can sit beneath, behind or to the side of the wordmark as long as the logo stays readable.
5. **Navigation trigger:** a minimal menu icon in a predictable corner.
6. **Edition/date information:** show only after the official wording and dates are confirmed. Until then, do not invent details.
7. **Scroll cue:** a small down arrow or “SCROLL TO EXPLORE” label if there is more homepage content below the fold.

### 4.2 Landing page content hierarchy

**Must have**

- AAYAM wordmark.
- Chrome object/interaction.
- Menu button.
- A clear indication that the site is for the NIT Agartala techfest, once the official naming/branding is approved.
- A graceful fallback if 3D assets fail or are disabled.

**May have, if approved**

- Fest dates and edition number.
- One-line tagline.
- Countdown.
- “Explore events” CTA that opens the Events section.
- “Registration opens soon” status strip.

Do not fill the landing page with long paragraphs, sponsor grids or repeated cards. Keep the main identity dominant.

### 4.3 Hero composition on different devices

**Desktop**
- Use a broad landscape composition with plenty of negative space.
- Make the wordmark large enough to read but avoid cropping its distinctive letterforms.
- Allow the chrome object to react to mouse movement without moving core text or controls unpredictably.

**Mobile**
- Use a deliberate portrait composition; do not simply crop the desktop hero.
- Keep the full wordmark visible and recognisable.
- Use touch-responsive tilt or a short idle animation instead of requiring a mouse.
- Reduce visual effect complexity and particle count.
- Ensure the menu trigger is easy to reach and has a large touch target.

### 4.4 Landing page scroll behaviour

The initial release can use a single-screen hero followed by a restrained lower section containing links to the seven site destinations. Alternatively, the menu may provide all navigation. Do not add lower-page content solely to create scrolling. If a lower section is included, it should provide a useful route into About, Events, Guests, Schedule, Sponsors and Our Team.

---

## 5. Cursor-responsive liquid-chrome object

This is a signature interaction and should be treated as a small, well-defined visual feature—not a reason to make the entire site a heavy 3D app.

### 5.1 Expected behaviour

- Render a three-dimensional, organic chrome form inspired by Reference Image 2.
- The material should be bright liquid silver/chrome white with dark mirrored areas and cool, glossy highlights.
- On desktop, the object should subtly follow or respond to the cursor position.
- The response should feel fluid and slightly delayed, with gentle rotation, deformation or reflected-light movement.
- On hover or close pointer approach, introduce a controlled **liquid-leak/drip effect**: small chrome strands or droplets appear to stretch away from the object and retract or merge back into it.
- The “leak” must feel like liquid metal—not water, paint or a particle explosion.
- When the pointer leaves, the object should smoothly return to its resting shape/state.
- The wordmark and navigation must never become obstructed by the effect.

### 5.2 Interaction states

| State | Expected result |
|---|---|
| Idle | Slow, near-imperceptible movement or static reflective pose |
| Cursor moves nearby | Object subtly tilts, shifts or changes reflected highlights |
| Hover/close interaction | Chrome form becomes more fluid; a few thin drips/strands emerge briefly |
| Pointer leaves | Drips retract; object eases back into resting pose |
| Touch device | Gentle tilt response to touch or low-intensity idle motion; no hover-only requirement |
| Reduced motion | Static chrome artwork or minimal non-motion effect |
| WebGL/3D failure | Display a high-quality static image or pre-rendered loop |

### 5.3 Motion constraints

- Use easing; avoid instant jumps and jitter.
- Use pointer smoothing/lerp to prevent nervous movement.
- Avoid large, distracting movement when the pointer is over the menu or any text.
- Do not continuously simulate physics if the object is off-screen or the browser tab is inactive.
- Limit droplets/strands and avoid expensive real-time fluid simulation unless testing proves it runs smoothly on typical student phones.
- Ensure interaction remains decorative: the user must not need to manipulate the orb to navigate the site.

### 5.4 Possible implementation approaches

**Preferred high-quality implementation:** Three.js or React Three Fiber with a suitable custom/standard metallic material, environment reflections and a lightweight deformation shader. Use pointer coordinates to update the object transform and shader parameters. A small, stylised drip animation can be implemented as geometry or a shader effect rather than a full fluid solver.

**Lower-complexity alternative:** a pre-rendered chrome animation/video or static image with cursor-driven parallax, masking and highlight movement. This will be more predictable on lower-end devices and can still look polished.

**Fallback:** a static image of the chrome object. The site must remain navigable if WebGL is unavailable, disabled or too slow.

### 5.5 Performance budget

- Load the interactive object after essential text and navigation.
- Dynamically import 3D code so other pages do not pay its cost unnecessarily.
- Pause or reduce animation when hidden or outside the viewport.
- Avoid multiple large 3D objects on the first viewport.
- Keep a tested static fallback available.

---

## 6. Navigation menu

Only the following seven top-level items are required. Do not add Workshops, Technites, Accommodation, Gallery or other items to the main menu unless the organisers approve a later revision.

1. Home
2. About
3. Events
4. Guests
5. Schedule
6. Sponsors
7. Our Team

### 6.1 Menu design

The menu should take inspiration from Reference Image 3:

- Full-screen or near-full-screen dark overlay.
- Large, condensed, clear menu labels.
- Thin horizontal divider between rows.
- Strong focus/active state in chrome white.
- A minimal close button.
- A small logo or AAYAM mark near the top.
- Smooth but short opening/closing transition.
- Enough spacing for comfortable touch interactions.

### 6.2 Navigation behaviour

- **Home:** closes the menu and returns to the landing page/top.
- **About, Events, Guests, Schedule, Sponsors, Our Team:** open the corresponding section or route and show the Coming Soon state until content is ready.
- Highlight the current destination when appropriate.
- Support keyboard navigation, Escape to close and a visible focus ring.
- Keep the page behind the open overlay from scrolling.
- Return focus to the menu button when the overlay closes.
- If a route is loaded directly, it must still display the correct placeholder state.

### 6.3 Route recommendation

Use stable, readable routes:

- `/` — Home
- `/about` — About
- `/events` — Events
- `/guests` — Guests
- `/schedule` — Schedule
- `/sponsors` — Sponsors
- `/team` — Our Team

If the project is built as a single-page application, these can be client-side routes. Each path must still work on refresh and when opened directly. Configure the hosting provider accordingly.

---

## 7. Page-by-page requirements

All pages below can initially use the same Coming Soon component. Build the content structure now so it can be replaced without redesigning navigation or routing.

### 7.1 Home (`/`)

**Status:** Designed landing page; not a placeholder.

- AAYAM wordmark in the supplied molten sculptural style.
- Near-black Technoir background.
- Cursor-responsive liquid-chrome object and hover drip effect.
- Menu button linking to all seven routes.
- Optional official dates/tagline/CTA only when confirmed.
- Static fallback for the 3D effect.

### 7.2 About (`/about`)

**Future content**
- Short introduction to AAYAM and the fest's purpose.
- Official connection to NIT Agartala.
- Theme explanation.
- Edition/date/venue information once confirmed.
- Optional approved facts or highlights.

**Until then:** show the shared Coming Soon state.

### 7.3 Events (`/events`)

**Future content**
- Search and category filters if the event count justifies them.
- Event cards with name, category, short description, date/venue if confirmed, and official destination link.
- Event detail page or modal for rules, eligibility, team size and prizes where needed.
- Clear registration status.

**Redirect-only model:** event registrations will point to externally hosted pages. The website will not collect registration data itself in the initial version.

**Until event information is approved:** show the shared Coming Soon state; do not show fake events or dummy registration buttons.

### 7.4 Guests (`/guests`)

**Future content**
- Approved guest/speaker photographs.
- Name, role, organisation and session title.
- Session timing or venue when confirmed.
- Official profile links if appropriate.

**Until then:** show the shared Coming Soon state. Do not use placeholder names or stock portraits that might be mistaken for confirmed guests.

### 7.5 Schedule (`/schedule`)

**Future content**
- Day-wise tabs or a chronological timeline.
- Correct start/end times and venues.
- Links to event details.
- A visible updated/cancelled state when necessary.
- Optional calendar links or a downloadable schedule.

**Until then:** show the shared Coming Soon state. Do not invent the fest dates or timings.

### 7.6 Sponsors (`/sponsors`)

**Future content**
- Sponsor tiers and partner categories only where officially defined.
- Approved logos and names.
- Links to the sponsors' official websites when permitted.
- Sponsor contact or partnership inquiry link if the organisers want one.

**Until then:** show the shared Coming Soon state. Do not include unconfirmed logos.

### 7.7 Our Team (`/team`)

**Future content**
- Approved organiser names and roles.
- Team photos only where permission is available.
- Official contact/social details for the relevant team.
- Optional department/team grouping if useful.

**Until then:** show the shared Coming Soon state; no invented profiles or contacts.

---

## 8. Coming Soon state

All non-Home destinations can show the same Coming Soon page until further notice. Implement it once as a reusable component rather than designing seven different placeholders.

### 8.1 Visual treatment

- Same near-black background as the main site.
- Small AAYAM wordmark or monogram.
- Main heading: **COMING SOON**.
- Optional short subtext: “This section is being prepared. Check back soon.”
- Subtle chrome-white highlight or a small, low-motion liquid-metal detail.
- A `BACK TO HOME` link/button.
- The standard menu remains available so users can move between sections.

### 8.2 Behaviour

- The state must load quickly and work without 3D assets.
- Do not make a “Notify me” input unless a real collection/notification flow exists.
- Do not show disabled buttons that look functional.
- If a section is launched later, replace the placeholder with real content without changing its route.

### 8.3 Suggested component API

```tsx
type ComingSoonProps = {
  sectionName: string;
  description?: string;
};
```

Use the same component on `/about`, `/events`, `/guests`, `/schedule`, `/sponsors` and `/team`.

---

## 9. Interaction and motion specification

### Global interactions

- Links and buttons have a restrained hover/focus treatment, such as a brighter chrome-white border or short highlight sweep.
- Transitions should be quick enough not to delay navigation.
- Avoid excessive parallax, scroll hijacking or motion that moves text under the user.
- Do not rely on hover states for important content; hover is unavailable on most touch screens.
- Use pointer-specific effects only when a fine pointer is detected.

### Motion accessibility

Respect the browser's `prefers-reduced-motion` setting. When reduced motion is enabled:

- Stop continuous rotation and large parallax movement.
- Disable the hover drip or replace it with a static visual change.
- Keep navigation functional and readable.
- Do not flash or rapidly strobe elements.

### Loading state

If an initial loading transition is used, it must be short and skippable. Do not require a long “boot sequence” before the visitor can interact. Prefer rendering the logo and menu immediately while the interactive visual loads in the background.

---

## 10. Frontend architecture and recommended stack

The initial site is mostly content display and external navigation. A custom backend is not needed for the first release.

### Recommended stack

| Layer | Recommendation | Reason |
|---|---|---|
| Framework | Next.js + TypeScript | Routing, metadata and component structure |
| Styling | Tailwind CSS or CSS Modules | Consistent tokens and responsive layouts |
| Animation | CSS transitions and Motion/Framer Motion | Menu and UI transitions |
| 3D | Three.js / React Three Fiber, only if needed | Cursor-reactive chrome object |
| Content | Static TypeScript/JSON data | Simple event and page content maintenance |
| Hosting | Vercel or another static-compatible host | Simple deployments and HTTPS |
| Backend | None initially | No custom registration or user data storage required |
| Analytics | Optional privacy-conscious analytics | Basic traffic insight if approved |

React + Vite is also suitable if that is what the development team already knows. The team should choose one stack and avoid adding libraries without a clear need.

### Architecture overview

```text
Visitor
  |
  v
Responsive frontend
  |-- Home / AAYAM hero
  |-- Navigation overlay
  |-- About (Coming Soon)
  |-- Events (Coming Soon -> future event list)
  |-- Guests (Coming Soon)
  |-- Schedule (Coming Soon)
  |-- Sponsors (Coming Soon)
  `-- Our Team (Coming Soon)

Static data/configuration
  `-- Approved copy, event metadata and external URLs

External destinations (when supplied)
  `-- Official event registration pages / maps / social profiles
```

### When a backend might be needed later

Add a backend only when a confirmed requirement calls for it, such as a private content-management dashboard, stored contact-form submissions, custom registrations, user accounts, live competition results or a third-party integration requiring protected credentials.

---

## 11. Content model and external redirects

### 11.1 Event data model for future use

Keep each event's information in one structured source. A minimal example:

```ts
export type FestEvent = {
  slug: string;
  title: string;
  category: string;
  description: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  eligibility?: string;
  teamSize?: string;
  registrationUrl?: string;
  status: "coming-soon" | "open" | "closed";
};
```

The fields are a starting point; only include those needed by the actual event list. Do not fill unconfirmed fields with fabricated information.

### 11.2 External registration rules

- Link directly to the official registration destination.
- Validate URLs before publishing and use HTTPS whenever supported.
- Use meaningful button labels such as `REGISTER` or `VIEW EVENT DETAILS`.
- Show registration status separately from the link itself.
- If registration is not open or the destination is not confirmed, do not show a dead CTA.
- External links that open a new tab should use safe link attributes, including `rel="noopener noreferrer"` with `target="_blank"`.
- Do not send users through an internal redirect endpoint unless analytics or link management has a clear approved requirement.
- If internal short links are introduced later, keep the destination allowlist-controlled to avoid open-redirect abuse.

### 11.3 No fake backend

A client-side list of links is enough to render the event catalogue. No database, authentication, payment processing or custom API is required merely to link to external forms.

---

## 12. Performance, accessibility and responsive behaviour

### Performance

- Use correctly sized, compressed WebP/AVIF images where appropriate.
- Avoid putting large uncompressed videos or 3D assets in the critical rendering path.
- Lazy-load below-the-fold images.
- Dynamically load the 3D component and use a poster/static fallback.
- Test on a mid-range Android phone and an average campus Wi-Fi/mobile connection.
- Avoid excessive custom fonts; subset and preload only what is necessary.
- Pause or reduce animation when the page is hidden.

### Accessibility

- Use semantic headings, navigation, links and buttons.
- Provide keyboard access to the entire menu.
- Keep a visible focus indicator.
- Give the menu trigger an accessible name, such as `Open navigation`.
- Use useful alternative text for meaningful imagery; use empty alt text for purely decorative art.
- Maintain readable contrast for all text, including muted captions.
- Do not communicate active/closed states by colour alone.
- Follow reduced-motion preferences.
- Keep text selectable; don't bake all interface text into a single image.

### Responsive layout

**Mobile**
- Portrait hero artwork and uncropped wordmark.
- Touch-sized controls.
- Lightweight or disabled high-cost 3D effects.
- Menu that fits the viewport and can scroll when necessary.

**Tablet**
- Scaled wordmark and orb, balanced whitespace and comfortable menu spacing.

**Desktop**
- Full composition with cursor interaction and more generous negative space.
- No layout shifts as 3D loads.

---

## 13. SEO, sharing and analytics

### SEO and social previews

Once official wording is confirmed, add:

- Page title and meta description.
- A consistent favicon/brand mark.
- Open Graph title, description and image.
- Canonical URLs if needed.
- Descriptive page headings for each route.
- `robots.txt` and sitemap where appropriate.

Use the approved event name and year; do not publish invented dates or edition numbers in metadata.

### Analytics (optional)

If organisers approve analytics, start with simple page views and clicks on event/registration links. Do not collect sensitive personal data. Publish an appropriate privacy notice if analytics or forms require it.

---

## 14. Security and operational requirements

- Keep all external links and destinations controlled by the organisers.
- Never put secret API keys in frontend code.
- Use HTTPS for the deployed site.
- Restrict external redirects to trusted destinations if redirect routes are used.
- Do not collect or store participant details unnecessarily.
- Confirm permissions for logos, photographs, videos and sponsor marks.
- Add a useful 404 page and ensure direct routes survive refresh on the chosen host.
- Store final content in version control so the team can review changes and roll back mistakes.

---

## 15. Suggested project structure

Example for a Next.js App Router project:

```text
app/
  layout.tsx
  page.tsx                 # Home / landing page
  about/page.tsx
  events/page.tsx
  guests/page.tsx
  schedule/page.tsx
  sponsors/page.tsx
  team/page.tsx
  globals.css

components/
  SiteHeader.tsx
  NavigationOverlay.tsx
  LiquidChromeObject.tsx
  HeroWordmark.tsx
  ComingSoon.tsx
  PrimaryButton.tsx
  SiteFooter.tsx

content/
  site.ts
  events.ts                # Add when event content is approved
  guests.ts                # Add when guest content is approved
  schedule.ts              # Add when schedule is approved
  sponsors.ts              # Add when sponsor content is approved
  team.ts                  # Add when team content is approved

public/
  images/
  video/
  fonts/

README.md
```

This is a suggested structure, not a requirement to use Next.js. Keep components small and keep page content separate from presentation.

---

## 16. Development phases

### Phase 1 — Identity and shell

- Confirm final AAYAM wordmark asset and whether it is a transparent PNG/SVG or a full-background image.
- Establish design tokens and typography.
- Build responsive layout, header and seven-item menu.
- Build the Home hero composition.

### Phase 2 — Chrome interaction

- Implement cursor-responsive object.
- Add controlled hover drip/strand state.
- Build touch and reduced-motion variants.
- Add static fallback.
- Test performance on mobile hardware.

### Phase 3 — Routes and placeholders

- Add `/about`, `/events`, `/guests`, `/schedule`, `/sponsors` and `/team`.
- Build the reusable Coming Soon component.
- Test direct navigation, refresh and back-button behaviour.

### Phase 4 — Approved content and redirects

- Replace placeholders as content is confirmed.
- Add official event data and registration destinations.
- Verify all links on desktop and mobile.
- Add guest, sponsor, schedule and team information only after approval.

### Phase 5 — QA and launch

- Check responsive layout, accessibility, load times and visual consistency.
- Verify metadata, favicon and social-sharing preview.
- Check 404 behaviour, HTTPS and all route URLs.
- Deploy to staging for organiser review, then production.

---

## 17. Testing and acceptance criteria

The first release is accepted when all of the following are true:

### Visual identity

- [ ] The AAYAM title uses the supplied sculptural style and preserves its warm metallic tones.
- [ ] The background feels Technoir and is primarily black/near-black.
- [ ] The liquid-chrome object uses cool silver/white reflections inspired by Reference Image 2.
- [ ] The object does not cover the wordmark or navigation.
- [ ] The overall UI remains restrained and monochrome beyond the wordmark.

### Interaction

- [ ] Cursor movement produces a smooth, deliberate response on desktop.
- [ ] Hover/close interaction triggers a restrained liquid-metal drip/strand effect.
- [ ] The effect retracts or returns to idle smoothly when interaction ends.
- [ ] Touch devices remain fully usable without hover.
- [ ] Reduced-motion users receive a static or low-motion experience.
- [ ] If 3D fails, the logo, menu and routes still work.

### Navigation and content

- [ ] The main menu contains exactly Home, About, Events, Guests, Schedule, Sponsors and Our Team.
- [ ] Each menu item routes to the correct page.
- [ ] Home opens the full landing page.
- [ ] The six non-Home sections display the Coming Soon state until the content is approved.
- [ ] The menu opens/closes by touch, mouse and keyboard.
- [ ] Direct URLs and browser refresh work on every route.
- [ ] No invented events, guest names, dates, sponsor logos or registration links appear.

### Quality

- [ ] The layout works on mobile, tablet and desktop without horizontal overflow.
- [ ] Text contrast and focus indicators are readable.
- [ ] Main content renders before heavy visual effects finish loading.
- [ ] All visible buttons and links do something appropriate.
- [ ] No placeholder or dead registration links are published.

---

## 18. Information required from the organisers

These details can be collected later; the initial shell and Coming Soon pages can be developed without all of them.

### Needed to finalise Home

- Official AAYAM logo/wordmark asset at the highest available quality.
- Whether the supplied wordmark image is final or only a visual reference.
- Official fest name, edition/year, tagline and dates.
- Approved NIT Agartala logo(s) and branding rules.
- Whether the hero should be desktop-first, mobile-first or designed equally for both.

### Needed before opening content sections

- Approved About text.
- Final list of events and their categories.
- Official registration destination for each event.
- Confirmed guests and profile assets.
- Confirmed schedule and venue details.
- Approved sponsor logos and names.
- Organising team names/roles and official contact details.

### Operational

- Domain name and hosting account/owner.
- Who will maintain event links and text.
- Who approves content before publication.
- Whether analytics are allowed/required.
- Whether any contact form or central registration destination will be needed later.

---

## 19. Optional future enhancements

Only consider these once the core website is stable and official content exists:

- Event search and category filters.
- Day-wise interactive schedule.
- Add-to-calendar links.
- Downloadable event brochure.
- Interactive campus map with approved location data.
- Gallery/aftermovie.
- Sponsor inquiry form.
- Announcement ticker for confirmed updates.
- A participant pass that links to a real external confirmation page.
- A “happening now” panel during the fest, if the schedule can be kept accurate.
- CMS for frequent updates by non-developers.

Avoid adding login, custom payments, live leaderboards or stored participant data unless a specific need and responsible owner are confirmed.

---

## 20. External design references

These sites were mentioned as potential benchmarks for information architecture and event-site patterns. Their content and availability can change, so check each site before using it as an implementation reference. The AAYAM design should remain original.

- [ENGINEER — NITK Surathkal](https://engineer.nitk.ac.in/) — technical-festival identity, thematic navigation and event grouping.
- [Cognitia — NIT Meghalaya](https://cognitia.nitm.ac.in/) — event categories and event discovery.
- [Currents — NIT Trichy schedule](https://currents.nitt.edu/schedule) — day-wise programme and timetable structure.
- [NiT Fiesta](https://nit.ac.in/nitfiesta/) — separation of technical/cultural experiences where relevant.
- [IIT Bombay Techfest workshops](https://techfest.org/workshops) — workshop information and external registration patterns.
- [NITTFEST](https://www.nittfest.in/) — consistent event identity across content and visual storytelling.

**How to use these references:** borrow useful patterns—clear event categories, schedules, registration CTAs and readable navigation—not another fest's logo, illustrations, copy or distinctive design. Re-check current pages and URLs before citing them in any public document.

---

## Final recommendation

Build the first release around a single strong idea: **AAYAM in molten sculptural lettering, surrounded by a dark Technoir environment and a cursor-responsive liquid-chrome object with a restrained drip effect.** Keep the interface chrome-white and silver, and make the seven-item navigation exceptionally clear.

Implement the Home page fully. Create the other six routes now, but keep them marked **COMING SOON** until approved content is available. Use static content and direct external links for event registrations. This delivers the intended aesthetic without creating unnecessary backend complexity.

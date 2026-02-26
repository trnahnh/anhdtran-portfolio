# anhdtran.portfolio

> full-stack dev. powerlifting enthusiast. the most finance-bro tech bro you'll ever meet.

live at **[anhdtrn.com](https://anhdtrn.com)**

---

## what's in here

personal portfolio built with Next.js. nothing crazy, just a solar system, real-time hand tracking, a fluid simulation cursor, an interactive terminal, sfx typa thing, and a spotify widget. you know, the usual.

---

## stack

- **Next.js 16** + **React 19** + **TypeScript**
- **Three.js** + **postprocessing** — 3D solar system with bloom, procedural textures, asteroid belt, shooting stars
- **MediaPipe Hands** — webcam hand tracking, pinch-to-zoom + open-hand swipe orbit control
- **Framer Motion** — page transitions + animations
- **Lenis** — smooth scroll with lerp-based interpolation
- **Tailwind CSS v4**
- **Spotify API** — now playing, because why not

---

## features

**`/profile`** — where it starts. 2D solar system background, bio, contact.

**`/space`** *(dark mode only)* — full 3D interactive solar system. all 8 planets with PBR materials, realistic axial tilts, Saturn's rings, procedural Sun/Jupiter/Earth/Saturn textures, animated comets, asteroid belt, shooting stars, nebula backdrop, and unreal bloom post-processing. orbit the solar system by dragging, swiping your hand (Iron Man style), or arrow keys. pinch or scroll to zoom. hover/tap planets for fun facts. hand tracking via webcam for simultaneous pinch-to-zoom + open-hand orbit. keyboard fallback (← → orbit, ↑ ↓ zoom, W/S tilt). press Esc to exit.

**`/terminal`** — macOS-style interactive terminal. browse the portfolio via CLI commands (`help`, `whoami`, `about`, `projects`, `experience`, `contact`, `skills`, `theme`, `clear`). boot sequence intro with typing SFX, arrow key history, tab completion, live Cincinnati timezone clock. light/dark mode adaptive. press Esc to exit.

**cursor** — fluid WebGL simulation that follows your mouse around. feels good.

**smooth scroll** — lerp-based smooth scrolling via Lenis. adaptive touch/desktop tuning, disabled on immersive routes.

**footer** — live-ticking precise age counter with 12 decimal places. because why display a static number when you can watch yourself age in real time.

---

## acknowledgements

WebGL cursor fluid effect — **[Diwen Huang](https://github.com/diwenne)**

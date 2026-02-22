# anhdtran.portfolio

> full-stack dev. powerlifting enthusiast. the most finance-bro tech bro you'll ever meet.

live at **[anhdtrn.com](https://anhdtrn.com)**

---

## what's in here

personal portfolio built with Next.js. nothing crazy, just a solar system, real-time hand tracking, a fluid simulation cursor, an interactive terminal, sfx typa thing, and a spotify widget. you know, the usual.

---

## stack

- **Next.js 16** + **React 19** + **TypeScript**
- **Three.js** — 3D solar system with all 8 planets, procedural textures, comets, nebula
- **MediaPipe Hands** — webcam hand tracking, pinch-to-zoom gesture control
- **Framer Motion** — page transitions + animations
- **Tailwind CSS v4**
- **Spotify API** — now playing, because why not

---

## features

**`/profile`** — where it starts. 2D solar system background, bio, contact.

**`/space`** *(dark mode only)* — full 3D interactive solar system. all 8 planets with realistic axial tilts, Saturn's rings, procedural Jupiter/Earth/Saturn textures, animated comets, nebula backdrop. hand tracking via webcam for pinch-to-zoom. keyboard fallback (↑ ↓ / + −). press Esc to exit.

**`/terminal`** — macOS-style interactive terminal. browse the portfolio via CLI commands (`help`, `whoami`, `about`, `projects`, `experience`, `contact`, `skills`, `theme`, `clear`). boot sequence intro with typing SFX, arrow key history, tab completion, live Cincinnati timezone clock. light/dark mode adaptive. press Esc to exit.

**cursor** — fluid WebGL simulation that follows your mouse around. feels good. credit to **[Diwen Huang](https://github.com/diwenne)** for the original implementation.

---

## run it

```bash
npm install
npm run dev
```

---

## credits

cursor fluid effect — **[Diwen Huang](https://github.com/diwenne)**

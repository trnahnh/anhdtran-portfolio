"use client";

interface RotatingTextProps {
  texts: string[];
  interval?: number;
}

export default function RotatingText({ texts, interval = 3000 }: RotatingTextProps) {
  const count = texts.length;
  // Total cycle = count * interval (e.g. 4 * 3s = 12s)
  const totalDuration = count * interval;
  // Each text visible for (interval / total) of the cycle
  const showPct = 100 / count;
  // Transition takes ~300ms = 300/total * 100 percent of cycle
  const transPct = (300 / totalDuration) * 100;

  return (
    <span
      className="rotating-text-container inline-block overflow-hidden align-bottom"
      style={{ height: "1.4em" }}
    >
      {texts.map((text, i) => {
        // Each item's animation: hidden → slide in → visible → slide out → hidden
        const start = i * showPct;
        const fadeIn = start + transPct;
        const fadeOut = start + showPct - transPct;
        const end = start + showPct;

        return (
          <span
            key={text}
            className="block"
            style={{
              animation: `rotText-${count}-${i} ${totalDuration}ms infinite`,
              position: i === 0 ? "relative" : "absolute",
              left: i === 0 ? undefined : 0,
              bottom: i === 0 ? undefined : 0,
              opacity: 0,
              // Inline keyframes scoped per item
              // @ts-expect-error -- CSS custom keyframes via style injection below
              "--rt-start": `${start}%`,
              "--rt-fadeIn": `${fadeIn}%`,
              "--rt-fadeOut": `${fadeOut}%`,
              "--rt-end": `${end}%`,
            }}
          >
            {text}
            <style>{`
              @keyframes rotText-${count}-${i} {
                0%, ${start}% { opacity: 0; transform: translateY(100%); }
                ${fadeIn}% { opacity: 1; transform: translateY(0); }
                ${fadeOut}% { opacity: 1; transform: translateY(0); }
                ${end}% { opacity: 0; transform: translateY(-100%); }
                100% { opacity: 0; transform: translateY(-100%); }
              }
            `}</style>
          </span>
        );
      })}
    </span>
  );
}

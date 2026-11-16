"use client";

import { useEffect } from "react";
import { audioUnlocked, unlockAudio } from "@/lib/audio";

/**
 * Unlocks the shared audio context at the visitor's first gesture, on any
 * page, so sounds that start later without one (the /profile card spin)
 * can still be heard on phones. See lib/audio.ts.
 *
 * Listens for the events browsers count as user activation: pointerdown
 * for a mouse, pointerup and touchend for a finger, keydown, and click as
 * a backstop. Renders nothing.
 */
const EVENTS = ["pointerdown", "pointerup", "touchend", "keydown", "click"] as const;

export default function AudioUnlock() {
  useEffect(() => {
    const onGesture = () => {
      unlockAudio();
      // The unlock settles asynchronously; stop listening once it has.
      setTimeout(() => {
        if (audioUnlocked()) detach();
      }, 200);
    };
    const detach = () => {
      for (const e of EVENTS) document.removeEventListener(e, onGesture, true);
    };
    for (const e of EVENTS) document.addEventListener(e, onGesture, true);
    return detach;
  }, []);

  return null;
}

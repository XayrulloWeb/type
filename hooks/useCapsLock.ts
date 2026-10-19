"use client";

import { useEffect, useState } from "react";

export function useCapsLock() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const update = (event: KeyboardEvent) => setEnabled(event.getModifierState("CapsLock"));
    const reset = () => setEnabled(false);
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", update);
      window.removeEventListener("keyup", update);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return enabled;
}

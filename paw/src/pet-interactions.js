// Keep double-click petting distinct from repeated taps on a paw.
export function createPetInteractions(action, now = () => performance.now()) {
  let pawTaps = [],
    earTaps = [],
    spins = [];
  function tap(part) {
    const time = now();
    if (part === "ear") {
      earTaps = earTaps.filter((t) => time - t < 2500);
      earTaps.push(time);
      if (earTaps.length >= 5) {
        earTaps = [];
        action("detective");
        return "detective";
      }
      return null;
    }
    earTaps = [];
    pawTaps = pawTaps.filter((previous) => time - previous < 1400);
    if (part === "tail") {
      pawTaps = [];
      action("chase-tail");
      return "chase-tail";
    }
    if (part !== "paw") {
      pawTaps = [];
      return null;
    }
    pawTaps.push(time);
    if (pawTaps.length >= 3) {
      action("angry");
      return "angry";
    }
    return null;
  }
  function doubleTap(part) {
    if (part === "tail" || (part === "paw" && pawTaps.length >= 3)) return null;
    action("pet");
    return "pet";
  }
  function spin(delta) {
    const time = now();
    spins = spins.filter((x) => time - x.t < 1800);
    spins.push({ t: time, d: Math.abs(delta) });
    if (spins.reduce((n, x) => n + x.d, 0) > 500) {
      spins = [];
      action("dance");
      return "dance";
    }
    return null;
  }
  return { tap, doubleTap, spin };
}

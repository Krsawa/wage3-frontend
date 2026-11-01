import type { Transition } from "motion/react";

/**
 * The sliding "you are here" indicators: sidebar pill, History tab underline, range and
 * import-tab pills. No bounce: they move on every navigation, so they glide and stop.
 */
export const SLIDE: Transition = { type: "spring", duration: 0.25, bounce: 0 };

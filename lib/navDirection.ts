import { Platform } from 'react-native';

// Web-only screen-transition direction. This is set explicitly by
// navPush/navBack/navReplace below at the moment navigation is triggered —
// NOT inferred from the browser's 'popstate' event, which doesn't fire
// reliably for router.back() (expo-router doesn't guarantee it calls the
// real browser history.back() versus just updating navigation state and
// replacing the URL). Explicit beats inferred here: every screen in app/
// that navigates goes through these three helpers instead of calling
// `router.*` directly, so this flag is always accurate by construction.
let pendingDirection: 'forward' | 'backward' = 'forward';

// Read once per screen mount, via ScreenTransition's useState initializer.
// Deliberately non-destructive: React's dev-mode Strict Mode double-invokes
// render (and lazy useState initializers) on mount, so a read-and-clear here
// would have the first invocation correctly see 'backward' and clear it, then
// the second invocation see the already-cleared 'forward' — silently
// collapsing every back navigation to the forward animation. A pure read
// means both invocations agree.
export function peekNavDirection(): 'forward' | 'backward' {
  if (Platform.OS !== 'web') return 'forward';
  return pendingDirection;
}

// Called once post-commit (ScreenTransition's mount effect) so a screen that
// later remounts for an unrelated reason (Fast Refresh, etc.) doesn't inherit
// a stale direction. Effects — unlike the render-phase initializer above —
// settle after Strict Mode's double-invoke, so this is safe to call there.
export function resetNavDirection() {
  pendingDirection = 'forward';
}

type RouterLike = {
  push: (href: any) => void;
  replace: (href: any) => void;
  back: () => void;
};

/** Navigate forward to a new screen — slides in from the right. */
export function navPush(router: RouterLike, href: any) {
  pendingDirection = 'forward';
  router.push(href);
}

/** Replace the current screen — slides the new one in from the right by
 *  default (it's still a forward step from the learner's point of view),
 *  or from the left when explicitly marked as a "return trip" (e.g.
 *  dismissing an info screen back to the session). */
export function navReplace(router: RouterLike, href: any, direction: 'forward' | 'backward' = 'forward') {
  pendingDirection = direction;
  router.replace(href);
}

/** Go back to the previous screen — slides it in from the left. */
export function navBack(router: RouterLike) {
  pendingDirection = 'backward';
  router.back();
}

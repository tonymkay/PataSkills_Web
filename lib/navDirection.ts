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

// Consumed once per screen mount (ScreenTransition's useState initializer)
// then reset to the common case, so a screen that happens to remount for
// an unrelated reason doesn't inherit a stale direction.
export function consumeNavDirection(): 'forward' | 'backward' {
  if (Platform.OS !== 'web') return 'forward';
  const direction = pendingDirection;
  pendingDirection = 'forward';
  return direction;
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

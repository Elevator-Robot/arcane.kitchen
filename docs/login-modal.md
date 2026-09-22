# Image-led login modal

## Layout

- The original `/images/member-kitchen-hero.webp` remains the artwork. Desktop uses
  an image column and a wider parchment form column; mobile uses a compact image header.
- `src/components/AuthModal.tsx` provides the reusable shell. Its frame is bounded
  by the visible viewport, including keyboard-driven viewport changes, with an
  independently scrollable form and an always-reachable close control.
- Amplify's default 480px container previously overflowed the form column. The
  scoped `.auth-panel` rules make its containers fluid, remove duplicate form padding,
  and allow field groups to shrink. Do not reintroduce a fixed form width.
- Sign-in has a welcoming header. Recovery screens retain their native headings;
  confirmation receives a clear inbox heading and keeps the existing six-digit input.
- Enter uses native form/button behavior. In particular, activating a password
  visibility switch or password-recovery link must not submit the sign-in form.
- The install prompt is not displayed over an open authentication modal.

## Verification

- All 84 Vitest tests and the separate Node CLI test pass. The production build
  passes; changed TypeScript files lint without errors (one existing fast-refresh warning).
- Real Authenticator layout checked at 1280×720, 1024×600, 768×1024, 390×844,
  320×568, 844×390, and 320×360. The card, form controls, and close action stay within
  bounds; small screens scroll vertically without horizontal clipping.
- Password recovery and six-digit confirmation checked using intercepted Cognito
  fixture responses. No emails were sent or real accounts changed by these checks.
- Keyboard checks cover Enter on password recovery/visibility controls, focus
  containment, Escape dismissal, and restoration to the sign-in trigger.
- Unit tests cover the original image, dismissal, visible-viewport resizing, and
  authentication-route heading behavior.

# Image-led login modal

## Layout

- The original `/images/member-kitchen-hero.webp` is a 1536×1024 tabletop scene.
  Herbs, crystals, bottles, candles, and books frame a clear wooden center. The full
  image uses `object-fit: contain` in the initial 3:2 choice screen and desktop layout.
- On desktop the modal frame matches the image's 3:2 proportions, removing the dark
  top/bottom gallery margins. The login form sits directly on the clear wooden
  center, slightly left of center to respect the book on the right. Its wrapper is
  transparent, without an inner panel, border, shadow, or backdrop blur.
- The image and form share one composition on every screen size, never a white
  panel beneath the image. Compact email/recovery views grow to their content's
  height, capped by the visible viewport. They do not fill the screen with empty
  wood above and below the form. Inputs remain full-width; secondary email actions
  share a row with shorter visible labels and complete accessible names.
- Compact expanded forms use the original image directly with a centered `cover`
  fit. It scales proportionally to fill the form's frame, cropping outer edges when
  necessary instead of adding wood bands or stretching the image. The experimental
  wood-extension asset is removed. Keyboard-constrained or unusually short viewports
  retain scrolling as a fallback.
- The previous full-image gradient veil, centered wordmark, and corner marketing
  copy are removed. Warm ivory text and dark translucent inputs provide contrast
  at the individual controls while the wood remains visible between them. Sign-in
  and password-recovery buttons use matching glass-like surfaces at every size.
- `src/components/AuthModal.tsx` provides the reusable shell. Its frame is bounded
  by the visible viewport, including keyboard-driven viewport changes, with an
  independently scrollable form and an always-reachable close control.
- Amplify's default 480px container previously overflowed the form column. The
  scoped `.auth-panel` rules make its containers fluid, remove duplicate form padding,
  and allow field groups to shrink. Do not reintroduce a fixed form width.
- Sign-in uses a single non-selectable, italic-accented `Arcane Kitchen` wordmark immediately above
  Google login, replacing the extra branding, member label, welcome text, and description.
  The close control is anchored to the top-right corner of the image frame.
- Other titles, including Reset Password, are also non-selectable. Submit, recovery,
  and back-navigation buttons all use the glass treatment.
- Native error alerts use a readable, warm dark surface with separate icon, message,
  and compact dismiss columns. Glass-button styling excludes the alert's dismiss
  control so it cannot take the message's width and force one-word lines.
- Google-first sign-in offers **Continue with Google** and a visible **Continue with
  email** button. The divider is removed. Selecting email hides Google and reveals
  the credential fields, submit button, and recovery action; a **Back to sign-in
  options** button restores the Google-first choices.
- `AuthSignInOptions` keeps disclosure state across Authenticator routes;
  `EmailSignInFooter` uses the supported footer slot. Native fields remain mounted
  during collapse/reopen to retain input values, and opening focuses the email field.
  Errors reveal and retain email sign-in; recovery returns with it still expanded.
  An explicit return to sign-in options remains available after an error.
  Closing the whole modal resets the choice. No credentials are added to localStorage.
- Google uses the existing native Amplify federated button and OAuth flow. Only its
  English label is customized using Amplify I18n.
- Recovery screens retain their native headings;
  confirmation receives a clear inbox heading and keeps the existing six-digit input.
- Enter uses native form/button behavior. In particular, activating a password
  visibility switch or password-recovery link must not submit the sign-in form.
- The install prompt is not displayed over an open authentication modal.

## Verification

- All 88 Vitest tests and the separate Node CLI test pass. The production build
  passes; changed TypeScript files lint without errors (one existing fast-refresh warning).
- The original image remains the sole artwork; initial choices show the full scene,
  while compact expanded forms fill their frame with the proportional centered crop.
- Real Authenticator layout checked at 1440×900, 1280×720, 1024×600, 768×1024, 390×844,
  320×568, 844×390, and 320×360. The card, form controls, and close action stay within
  bounds; small screens scroll vertically without horizontal clipping.
- Password recovery and six-digit confirmation checked using intercepted Cognito
  fixture responses. No emails were sent or real accounts changed by these checks.
- Keyboard checks cover Enter on password recovery/visibility controls, focus
  containment, Escape dismissal, and restoration to the sign-in trigger.
- Unit tests cover the original image, dismissal, visible-viewport resizing, and
  authentication-route heading behavior.
- Google-first checks cover email focus, preserved credentials, explicit switching
  back to Google, pending requests, failed sign-in, and return from password recovery.
- Expanded email controls fit without scrolling at 320×480, 320×568, 390×844, and
  768×1024 in browser checks. Recovery headers cannot be selected, and the native
  Back to Sign In button has the same glass surface as the other controls.

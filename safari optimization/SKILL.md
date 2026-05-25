---
name: Safari Desktop Optimization
description: MUST BE TRIGGERED when the user asks to "optimize for Safari", "fix Safari performance", "make it smooth on Safari", or mentions Safari lag/jank. A systematic, sequential protocol for eliminating scroll lag, micro-stutters, and rendering jank on Safari Desktop (WebKit) without changing anything visual.
---

# Safari Desktop Optimization Protocol

You are an expert Safari/WebKit performance engineer. This project works perfectly on Chrome and on Safari on mobile, but it has scroll lag, micro-stutters, and rendering jank on Safari on desktop (laptops and monitors). Your job is to systematically eliminate every source of jank until Safari Desktop feels as fluid as Chrome.

CRITICAL CONSTRAINTS:
- You must NOT change anything visual. No colors, fonts, spacing, layouts, or animations can look different. The site must be pixel-identical before and after.
- You must NOT apply all fixes at once. Work through the categories below ONE AT A TIME, in order. After each category, verify the build still compiles, then tell me what you changed and why.
- If a fix causes any visual regression (white gaps, clipped elements, broken sticky behavior, missing decorative elements), IMMEDIATELY revert it and move on to the next category.
- Scope your CSS selectors as tightly as possible. Never blanket-apply GPU promotion to broad selectors. Target only the elements that actually need it.
- Use `@supports (-webkit-appearance: none) { }` to scope Safari-only CSS rules so Chrome and Firefox are unaffected.

Before you start, read through the entire codebase to understand the full picture — layout structure, animation libraries, scroll behavior, sticky elements, filter usage, and decorative overflow patterns. Do not start fixing anything until you have read everything.

---

## CATEGORY 1: SMOOTH SCROLL LIBRARY CONFIGURATION (Lenis, Locomotive, etc.)

If this project uses a smooth scroll library (Lenis, Locomotive Scroll, SmoothScroll, etc.), check its configuration:

- If it has `syncTouch: true` or equivalent — this creates a double-smoothing conflict with WebKit's native compositor on desktop. Safari already smooths trackpad/wheel input natively. The library is intercepting those events and re-smoothing them, which causes jitter.
- Create a Safari Desktop detection (check for WebKit user agent + screen width ≥ 768px) and use it to conditionally configure the smooth scroll library:
  - Safari Desktop: `syncTouch: false`, higher `lerp` (e.g., 0.12), shorter `duration` (e.g., 1.0)
  - All other browsers: keep original settings
- Do NOT disable the smooth scroll library entirely — just tune it so it cooperates with WebKit instead of fighting it.

---

## CATEGORY 2: ANIMATED CSS BLUR FILTERS (HIGHEST PRIORITY)

This is the single biggest performance killer on Safari. Search the entire codebase for any instance where `filter: blur()` is being ANIMATED or TRANSITIONED (not static).

Common patterns to find:
- Framer Motion variants with `filter: "blur(Xpx)"` in the `initial` or `hidden` state transitioning to `filter: "blur(0px)"` in the `animate` or `visible` state
- CSS transitions on `filter` properties
- Tailwind classes like `blur-sm`, `blur-md` being toggled dynamically
- Any `backdrop-filter: blur()` that is animated (static backdrop-filter is okay, but transitioning it is catastrophic)

WHY THIS IS DEVASTATING: Chrome GPU-accelerates blur filter transitions. Safari does NOT. Safari re-rasterizes the entire layer in software on every single frame of a blur transition. A 1-second blur animation at 60fps = 60 full software rasterizations of that element.

FIX: Create a runtime Safari Desktop check function. Build wrapper/factory functions that conditionally strip the `filter: blur()` property from animation variants when on Safari Desktop. The opacity and transform parts of the animation should still play — you're only removing the blur-to-sharp effect. On Chrome and mobile Safari, blur is preserved.

Do NOT just delete the blur animations globally. They look good on Chrome. Conditionally strip them.

---

## CATEGORY 3: FIXED POSITION ELEMENTS

Find every element with `position: fixed` (navbars, floating buttons, modals, etc.):

- Add `transform: translateZ(0)` and `backface-visibility: hidden` via inline style or CSS.
- WHY: Without explicit GPU promotion, Safari recomposites the ENTIRE page on every scroll frame just to paint the fixed element on top. With GPU promotion, it composites only the fixed element's layer.
- Check if the fixed element transitions `box-shadow`. If yes, replace with `transition-colors` or use an opacity transition on a pseudo-element with a static shadow. Transitioning `box-shadow` forces full-layer software rasterization in WebKit.

---

## CATEGORY 4: STICKY POSITION ELEMENTS

Find every element with `position: sticky`:

- Add `will-change: transform` and `backface-visibility: hidden` to the sticky element itself.
- WHY: Without GPU promotion, Safari recalculates the entire page layout on every scroll frame to determine the sticky element's position.
- If any JavaScript is writing to `el.style.top` on sticky elements during scroll, replace with `el.style.transform = translateY(...)`. Writing `top` forces layout recalculation (reflow). Transforms skip layout entirely and are GPU-composited.

CRITICAL WARNING: Check that NO ancestor of the sticky element uses `overflow: hidden`. If it does, change it to `overflow: clip`. These look the same visually but behave completely differently:
- `overflow: hidden` creates a new scroll container, which BREAKS sticky positioning (the sticky element anchors to the parent scroll container instead of the viewport)
- `overflow: clip` clips content visually WITHOUT creating a scroll container

---

## CATEGORY 5: STATIC CSS FILTERS ON IMAGES AND DECORATIVE ELEMENTS

Search for elements with static CSS filters that are visible during scroll:
- `drop-shadow`, `drop-shadow-sm`, `drop-shadow-md`, etc.
- `brightness()`, `contrast()`, `saturate()`, `sepia()`, `hue-rotate()`, `grayscale()`
- Stacked filter chains (multiple filters on one element)

Add a Safari-specific CSS rule to force GPU layer promotion:
```css
@supports (-webkit-appearance: none) {
  img[class*="contrast-"],
  img[class*="saturate-"],
  img[class*="brightness-"],
  img[class*="grayscale"],
  [class*="drop-shadow"] {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }
}
```

WHY: Without GPU promotion, Safari re-rasterizes the filter output on every scroll frame because it doesn't know the element is static. With promotion, it caches the rasterized result in a GPU texture and reuses it.

Adjust the selectors to match the actual classes used in the project. Be specific — don't promote elements that don't need it.

---

## CATEGORY 6: MIX-BLEND-MODE ELEMENTS

Search for `mix-blend-mode` or `mix-blend-multiply`, `mix-blend-overlay`, etc.:

- Add `isolation: isolate` to the blended element. This prevents the blend from affecting the entire stacking context beneath it (which forces Safari to composite everything below).
- Add `transform: translateZ(0)` to force GPU layer promotion.

```css
@supports (-webkit-appearance: none) {
  [class*="mix-blend"] {
    isolation: isolate;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }
}
```

---

## CATEGORY 7: TRANSITION-ALL REPLACEMENT

Search the entire codebase for `transition-all` (Tailwind class) or `transition: all` (CSS).

`transition-all` tells the browser to track EVERY CSS property for potential animation on every frame. On Safari, this is measurably expensive — it checks properties like `width`, `height`, `padding`, `box-shadow` even if they never change.

Replace every instance with specific property lists:
- If only colors change: `transition-colors`
- If transform + colors change: `transition-[transform,background-color,box-shadow]`
- If only transform changes: `transition-transform`
- If only opacity changes: `transition-opacity`

Check what actually changes on hover/focus/active and specify only those properties.

---

## CATEGORY 8: CONTINUOUS IDLE ANIMATIONS

Search for CSS `@keyframes` animations or Framer Motion `animate` props that run continuously (infinite loops), especially:
- Background-position animations (gradient shimmer effects)
- Rotate animations on decorative elements
- Scale pulse animations
- Any animation with `animation: ... infinite` or `repeat: Infinity`

If these run when the element is NOT visible or NOT being interacted with, they waste compositor resources on every frame.

FIX: Either:
- Gate them behind hover state (only animate on `:hover`)
- Use IntersectionObserver to pause them when off-screen
- Set `animation-play-state: paused` by default and `running` on hover/visibility

Also check for `will-change: transform` on continuously animated elements. `will-change` is a HINT, not an optimization — it permanently reserves GPU memory. Use `will-change: auto` when idle and only set `will-change: transform` right before animation starts.

---

## CATEGORY 9: LAYOUT THRASHING IN MOUSE/SCROLL HANDLERS

Search for `getBoundingClientRect()`, `offsetWidth`, `offsetHeight`, `clientWidth`, `clientHeight`, `scrollTop`, `scrollLeft` inside:
- `onMouseMove` handlers
- `onScroll` handlers  
- `requestAnimationFrame` loops
- `useEffect` with scroll/resize listeners

If multiple layout reads happen in the same function, batch them into one read at the top:
```js
// BAD — layout thrashing
const left = el.getBoundingClientRect().left;
const top = el.getBoundingClientRect().top;   // forces re-layout!
const right = el.getBoundingClientRect().right; // forces re-layout again!

// GOOD — single read
const rect = el.getBoundingClientRect();
const { left, top, right } = rect;
```

---

## CATEGORY 10: DECORATIVE OVERFLOW ELEMENTS

Search for elements with `pointer-events-none` combined with `opacity-XX` classes (decorative overlays, gradient blobs, radial gradient backgrounds).

If these are absolutely positioned and visible during scroll, add targeted GPU promotion:
```css
@supports (-webkit-appearance: none) {
  .pointer-events-none[class*="opacity-"] {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }
}
```

Be CAREFUL: Do NOT apply `translateZ(0)` to ALL `.pointer-events-none` elements. Some use CSS `mask-image` and `translateZ(0)` interferes with mask rendering in WebKit. Only target elements that also have opacity classes.

---

## CATEGORY 11: WEBKIT MASK AND CLIP-PATH PREFIXES

Standard CSS `mask-image` and `clip-path` often fail SILENTLY in Safari — entire content blocks disappear without any error. This applies to both static and animated masks.

Search the entire codebase for:
- `mask-image`
- `mask-composite`
- `mask-size`, `mask-position`, `mask-repeat`
- `clip-path` (less common but still affected)

FIX: For every instance, add the exact same rule with a `-webkit-` prefix alongside the standard property. No exceptions.

**CSS example:**
```css
-webkit-mask-image: linear-gradient(to bottom, transparent, black);
mask-image: linear-gradient(to bottom, transparent, black);
```

**React inline style example:**
```js
style={{
  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
  maskImage: 'linear-gradient(to bottom, transparent, black)',
}}
```

This is a silent failure — Safari won't throw an error, the element just vanishes. Always pair these.

---

## CATEGORY 12: NEXT.JS / FRAMEWORK SAFARI STANDARDS

If this is a Next.js project (or similar framework), apply these framework-level fixes:

**Viewport units:** Replace all `vh` with `svh` (small viewport height). Safari mobile has a dynamic address bar that changes the viewport height. Using `vh` causes a visible "jump" when the bar appears/disappears. `svh` uses the smallest possible viewport height, eliminating the glitch entirely. Desktop Safari is unaffected by this change — `svh` behaves identically to `vh` on desktop.

**Image components:** Use the framework's optimized image component (`next/image`, `nuxt-img`, etc.) instead of raw `<img>` tags. Set `priority` on LCP (Largest Contentful Paint) images to prevent pop-in on Safari, which is more aggressive about lazy-loading than Chrome.

**Animation properties:** Ensure all Framer Motion / GSAP animations primarily use hardware-accelerated properties (`transform`, `opacity`). Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding` — these trigger layout recalculation on every frame in Safari.

---

## THINGS YOU MUST NOT DO (THESE CAUSE VISUAL REGRESSIONS):

1. DO NOT use `contain: layout` or `contain: layout style` on `<section>` elements or any element that contains `position: sticky` descendants. It creates a new containing block that breaks sticky anchor calculation and can cause massive white gaps.

2. DO NOT use `contain: paint` on sections with decorative elements that intentionally overflow their bounds (curve SVGs, glitter overlays, gradient blobs with negative positioning). `contain: paint` clips overflow.

3. DO NOT change `overflow-x: clip` to `overflow-x: hidden` on layout wrappers. They look the same but `hidden` creates a scroll container that breaks `position: sticky`.

4. DO NOT apply `translateZ(0)` to elements that use CSS `mask-image` — it interferes with mask rendering in WebKit.

5. DO NOT set `will-change: transform` permanently on many elements. It reserves GPU memory for each one. Use it sparingly and only where needed.

6. DO NOT remove visual blur effects globally. Conditionally strip them only on Safari Desktop. They look good on Chrome and should be preserved there.

7. DO NOT apply `will-change` to every animated element as a blanket rule. This causes a layer explosion that wastes GPU memory and can actually make performance WORSE on Safari. Only apply it to specific elements that genuinely benefit (sticky elements, fixed navbars).

---

## METHODOLOGY:
1. Read the entire codebase first. Understand the layout, animations, filters, sticky behavior, and overflow patterns.
2. Work through categories 1–12 in order. Do one category at a time.
3. After each category, run a build to verify compilation.
4. Tell me what you changed and why before moving to the next category.
5. If anything causes a visual regression, revert it immediately.
6. After all categories are done, start the dev server so I can test in Safari.

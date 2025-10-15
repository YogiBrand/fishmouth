# Animation Notes (what we mimicked from jitter.video)

- **Large horizontal scroll**: Instead of animating absolute pixel values per breakpoint,
  we mirror Jitter's approach: drive a **0..1 progress** with GSAP ScrollTrigger and feed
  it into **CSS variables** (`--progress`) and **calc()** transforms. This keeps logic simpler
  and more responsive.
- **CSS linear() spring-like easings**: Use the `--fm-spring` var in brand tokens to
  add a lively feel to subtle transitions without heavy JS timelines.
- **Lottie-ready**: Where you see images today, you can drop in a `<Lottie />` component.
- **Perf**: Transforms (translate/opacity) only; sticky pinning during the gallery keeps
  DOM minimal and predictable.

See “A Behind-the-Scenes Look at the New Jitter Website” on Codrops (Sept 2, 2025) for
a detailed breakdown of these techniques.

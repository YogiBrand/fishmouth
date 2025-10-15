# Fish Mouth Brand Guide (Marketing Site)

## Palette
- **Primary Navy**: `#0B1220` (bg) / `#101826` (surface)
- **Text**: `#E6E9EF`
- **Muted**: `#A9B4C2`
- **Accent 1**: `#1F76FF`
- **Accent 2**: `#23C8FF`
- **OK/Success**: `#22C55E`
- **Warning**: `#FBBF24`
- **Danger**: `#EF4444`

The public site should feel **calm and neutral** (navy surfaces + subtle cyan highlights),
while the in-app dashboard can be more saturated.

## Type
- **Display & UI**: Inter / system UI stack (`--fm-font-display`)
- **Mono (numbers)**: System monospace (`--fm-font-mono`)

## Motion
- Use CSS `linear()` spring variable `--fm-spring` for micro transitions.
- Respect `prefers-reduced-motion`; pinning should no-op when reduced.

## Spacing & Radius
- `--fm-radius: 14px` to keep a consistent soft geometry.
- Avoid cramped layouts; maintain 64px+ section padding.

## Imagery
- Prefer real dashboard screenshots.
- Overlay cards: blur + translucent background with 1px border at 8% white opacity.
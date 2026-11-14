# Web creative stack (this project)

Canonical libraries for Silent Fleet continuum work. Prefer these over inventing alternate stacks.

| Layer | Package / source | Role |
| --- | --- | --- |
| Render core | [three.js](https://github.com/mrdoob/three.js) (`three`) | Scene graph, cameras, materials, WebGLRenderer |
| React bridge | [react-three-fiber](https://github.com/pmndrs/react-three-fiber) (`@react-three/fiber`) | Declarative Three in React; `Canvas`, `useFrame` |
| Helpers | [drei](https://github.com/pmndrs/drei) (`@react-three/drei`) | Controls, loaders, Environment, Html, helpers |
| Post | [react-postprocessing](https://github.com/pmndrs/react-postprocessing) (`@react-three/postprocessing`) | Bloom, DOF, vignette, custom Effect passes |
| Timeline motion | [GSAP](https://github.com/greensock/GSAP) (`gsap`) | Timelines, ScrollTrigger, tweens of DOM + Three props |
| Smooth scroll | [Lenis](https://github.com/darkroomengineering/lenis) (`lenis`) | Virtual scroll spine; sync with ScrollTrigger / film drive |
| Cinematic edit | [Theatre.js](https://github.com/theatre-js/theatre) (`@theatre/core`, `@theatre/studio`) | Keyframed sequences; studio is **dev-only**. `@theatre/r3f` still peers R3F 8 — prefer imperative Theatre + R3F refs until peers catch up. |
| Shader craft | [ShaderToy](https://www.shadertoy.com) | Reference patterns (noise, FBM, raymarch) — port to Three GLSL carefully |

## Project invariants (Silent Fleet)

- One continuum canvas; film progress drives camera/planets — do not mount/unmount heavy scenes per section.
- Scroll + GSAP may write into mutable refs (`filmDriveRef`); R3F `useFrame` reads them — never `setState` every frame.
- Prefer critically damped springs / GSAP eases over remounting option wheels or HUD.
- Respect `prefers-reduced-motion`; keep a readable DOM path when WebGL throttles.

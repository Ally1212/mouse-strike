# Fighter reconstruction pipeline

This directory is generated and reviewed with the `img2threejs` skill installed at `~/.codex/skills/img2threejs`.

## Current status

| Fighter | Reference probe | Pre-spec assessment | Detail inventory | Sculpt spec | Gate status |
| --- | --- | --- | --- | --- | --- |
| F-22 Raptor | Pass | Generated | 3x3 zones generated | Starter generated | Blocked until the component tree and materials are authored |
| Eurofighter Typhoon | Pass | Generated | 3x3 zones generated | Starter generated | Strict gate pending |
| Dassault Rafale | Pass | Generated | 3x3 zones generated | Starter generated | Strict gate pending |
| JAS 39 Gripen | Pass | Generated | 3x3 zones generated | Starter generated | Strict gate pending |
| Sukhoi Su-57 | Pass | Generated | 3x3 zones generated | Starter generated | Strict gate pending |
| Chengdu J-20 | Pass | Generated | 3x3 zones generated | Starter generated | Strict gate pending |
| 歼-35 鹘鹰概念机 | Runtime render | Not started | Not started | Not started | Original procedural adapter, no exact reconstruction claim |
| F/A-XX 白隼概念机 | Runtime render | Not started | Not started | Not started | Original procedural adapter, no exact reconstruction claim |

All starter specs remain below strict reconstruction quality. The runtime uses stylized, reference-informed adapters documented in `AIRFRAME_ADAPTERS.md`; the two concept aircraft use original procedural renders and are not represented as exact real-aircraft reconstructions.

## Production route

1. Use the Wikimedia reference only for observable silhouette, proportions, surface zones, and aircraft-specific structure.
2. Keep hidden geometry explicitly marked as inferred; one photograph cannot prove the underside or opposite side.
3. Author the flight configuration first and pass its fixed-view plus two orbit-view gates.
4. Map the accepted flight components onto the fictional transformation hierarchy without changing the source aircraft identity.
5. Expose pivots, sockets, colliders, detachable Boss-hit parts, and `sculptRuntime` nodes.
6. Replace a fighter in `fighter-rig.js` only after blockout, structural, form, material, lighting, interaction, and optimization passes are reviewed.

## Runtime mapping

The final factories should preserve the existing game contract:

- return a `THREE.Group` with named components;
- expose movable wing, canard, tail, intake, engine, shoulder, arm, and core nodes;
- keep the current `setTransform(progress)` behavior;
- remain usable in the hangar and orthographic battle renderer;
- stay within the existing real-time performance budget and Canvas fallback boundary.

The references are not projected as permanent aircraft textures. They guide procedural geometry and material zones; game colors, weapons, transformation behavior, and combat abilities remain fictional.

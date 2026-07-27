# F-22 Raptor visual analysis

## Suitability

Technical probe: pass, `1280x960`, no decode or resolution warnings.

Semantic verdict: conditional pass. The image clearly shows the top and port-side planform, cockpit, nose, wing leading edges, twin canted tails, intake shoulders, and part of both exhaust housings. The underside, starboard surface detail, landing gear bays, and exact nozzle depth are hidden and must remain inferred.

## Observed hierarchy

- Macro: pointed faceted nose, blended central fuselage, left/right trapezoidal wings, twin engine rear body.
- Meso: dark canopy, two side intakes, twin canted vertical stabilizers, paired exhaust housings, leading/trailing control surfaces.
- Micro: sawtooth panel breaks, wing-tip edge changes, canopy rim, intake lips, control-surface seams, small access panels, navigation-light zones, nozzle ring segmentation, tonal RAM panel variation.

## Geometry strategy

- Use a lofted faceted fuselage rather than a box or cylinder.
- Use extruded planform shapes for wings and stabilizers so sweep and taper survive orbit views.
- Keep intakes, canopy, nozzles, and each control surface as named components.
- Mirror only after the visible port-side proportions are locked; mark mirrored starboard details as inferred.
- Use separate pivots for wings, tails, intake shoulders, and engine housings so the fictional mech transformation does not deform the accepted flight silhouette.

## Material strategy

- Painted stealth coating: low-saturation gray-green zones, medium-high roughness, subtle panel-to-panel value shifts.
- Canopy: dark tinted dielectric with controlled clearcoat, not an emissive black block.
- Exhaust: darker metallic rings with independent roughness and radial segmentation.
- Panel seams and RAM variation are local masks; they must not be represented by one noisy albedo map.

## First gate failures to resolve

The current starter spec is blocked because it contains one generic root component, one generic material, no repetition system, no local detail inventory, and no object-specific review targets. Do not generate a replacement factory until those fields are authored and strict validation passes.

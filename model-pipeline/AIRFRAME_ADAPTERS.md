# Runtime airframe adapters

These adapters translate observable features from one licensed reference image per fighter into a stylized real-time Three.js rig. They do not claim photogrammetric or engineering accuracy. Hidden surfaces, underside geometry, and exact cross-sections remain inferred.

| Fighter | Observable identity retained | Runtime assault form |
| --- | --- | --- |
| F-22 Raptor | broad stealth planform, clipped diamond wings, twin canted tails, twin engines | Raptor Warden: compact biped, shoulder wing blades, raised tail stabilizers and seeker racks |
| Eurofighter Typhoon | large delta wing, close canards, single vertical tail, twin engines | Tempest Lancer: vertical delta shields, single crest and central rail lance |
| Dassault Rafale | curved delta wing, close canards, single tail, twin engines | Phase Seraph: separated curved wings, canard forearm blades and paired energy rings |
| JAS 39 Gripen | compact delta wing, canards, single tail, single engine | Nordic Strider: central mono-thruster with detached wing drones and a narrow frame |
| Sukhoi Su-57 | very broad blended planform, twin engines, twin canted tails | Siege Beast: horizontal armored platform with four-point support and forward siege cannons |
| Chengdu J-20 | long nose, large canards, swept delta wing, twin tails and twin engines | Celestial Commander: long central armor, command canards, cape-like wings and four orbiting drones |
| 歼-35 鹘鹰概念机 | compact twin-engine stealth planform, wedge nose, clipped diamond wings and canted tails | Gyrfalcon Edge: folded shoulder wings, paired back blades and forearm feather blades |
| F/A-XX 白隼概念机 | tailless cranked-delta planform, long wedge nose, embedded twin engines and unmanned wingman | White Falcon Twin: horizontal wing body, vector thruster arms, twin rail and detached wingman |

## Runtime gate

- Every fighter must produce a distinct named-part and transform signature at full assault progress.
- Engine count must match the visible reference-level identity, including the Gripen single-engine constraint.
- Tool changes must swap both projectile behavior and visible weapon attachments.
- Flight and assault screenshots are reviewed at desktop and mobile sizes.
- Full image-matched reconstruction remains blocked until each sculpt spec passes the strict `img2threejs` component, material, detail and multi-angle review gates.

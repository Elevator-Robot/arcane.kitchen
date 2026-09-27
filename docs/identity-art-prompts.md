# Arcane Kitchen — Identity Art Prompt Book

Working draft · Revision 1 · All 21 concepts await review.

This is our editable source for generating and refining identity artwork. These
are proposed images, not implemented assets. Names and stored IDs follow
`src/utils/kitchenIdentity.ts`; suggested filenames below are not existing files.

## The world we are depicting

An old culinary archive survives through the people who cook from it. Recipes
have passed through remote provinces, shuttered abbeys, and houses whose names
have disappeared from maps. Their keepers work with ordinary things: salt,
roots, copper, flour, fire. Something older occasionally leaves its mark.

The hearth offers genuine shelter. The world beyond it is immense and only
partly understood. Mystery should reward a second look rather than overwhelm the
first. Let a missing reflection, an unexplained light, or a watchful animal carry
the unease.

Our reference points are the weathered, provincial worldbuilding of The Elder
Scrolls and Lovecraftian uncertainty about what lies beyond human understanding.
Build original places, symbols, and creatures from those broad qualities. The
images should belong to Arcane Kitchen, without reproducing franchise characters,
logos, named locations, or existing birthsign artwork.

## How to use this book

For each generation, combine:

1. The **shared art-direction prompt** below.
2. The category's **composition instructions**.
3. The entry's **image prompt**.
4. The **shared exclusions**, plus any entry-specific exclusions.

If the generator has no negative-prompt field, append the exclusions as plain
instructions. Set the aspect ratio in the generator as well as describing it in
the prompt. Save the prompt revision and generation settings with each candidate.

Approve one anchor image per category before generating the whole set. Use an
approved image as a visual reference when the chosen tool supports it. The text
alone will not guarantee matching brushwork, lighting, or character identity.

### Shared art-direction prompt

> Create an original illustration for Arcane Kitchen, an ancient culinary archive
> in a lived-in dark-fantasy world. Use the visual language of a weathered oil
> painting: thin translucent glazes, softly worked shadows, restrained visible
> brushwork, and finely observed material textures. Surfaces bear believable wear:
> soot, tarnished metal, rubbed wood, old stone, linen, and imperfect ceramic.
> Use muted mineral pigments, deep but readable shadows, and one controlled source
> of light. Give the image a clear silhouette and a deliberate focal point that
> remain legible at a small interface size. The atmosphere is intimate, solemn,
> and quietly uncanny. Imply an older, larger world outside the frame. Render
> edge-to-edge artwork without typography, captions, decorative card borders,
> watermarks, or interface elements. Preserve midtone detail; this must remain
> readable on a phone, not disappear into black.

### Shared exclusions

> No lettering, readable runes, signatures, logos, watermarks, or mock interfaces.
> No cartoon, chibi, anime, oversized expressive eyes, smiling mascots, glitter,
> rainbow magic, neon effects, glossy plastic, or generic mobile-game rendering.
> No modern appliances, electric lights, contemporary packaging, or laboratory
> plastics. No gratuitous skulls, tentacles, gore, jump-scare monsters, or elaborate
> ornament covering every surface. Avoid cinematic lens flare, excessive bloom,
> muddy silhouettes, crushed blacks, and tiny objects scattered everywhere.

### Proposed format and interface rules

- **All selector artwork:** landscape 3:2 masters, ideally 1536 × 1024 or larger.
  Calling masters should also tolerate a wide 2:1 banner crop.
- Keep identifying features within the central 70% of the width and central 60%
  of the height. Let background scenery extend to the edges. Preview the actual
  crops before accepting an asset.
- Reserve a relatively quiet lower strip for a possible HTML label overlay.
  Do not paint a label, plaque, or blank ribbon into the image.
- Birthsigns are **omens**; Callings are **places of practice**; Familiars are
  **individual living companions**. Those distinctions should be apparent without
  text.
- Labels, hover/focus effects, and selection indicators belong to the interface,
  not the generated artwork. Touch layouts need an equivalent way to see names.
- Suggested filenames use stable IDs, so changing a display name will not require
  changing asset references.

---

## I. Birthsigns

### Category composition instructions

> Depict one original celestial omen, like a painted plate from an old atlas of
> the heavens. Center a strong, immediately recognizable symbolic silhouette
> against a spacious, atmospheric field. Suggest a constellation using only a
> few faint star points; avoid literal zodiac charts, dense diagrams, or text.
> The symbol should feel encountered in a vision, rather than manufactured as
> a shiny badge. Use restrained depth and a softly receding background. Landscape
> 3:2 composition, with the complete primary symbol safely inside a central crop.

### 01. The Lantern

- **Stored ID:** `moonlit`
- **Suggested file:** `birthsign-moonlit.webp`
- **Palette:** midnight violet, tarnished brass, faded plum, pale candle amber.
- **Meaning:** hidden knowledge; a light preserved for whoever comes next.

**Image prompt**

> An ancient enclosed brass lantern hangs in a field of midnight-violet darkness,
> its suspension chain disappearing before it reaches the top of the painting.
> The lantern is narrow and practical, with worn corners and slightly clouded
> glass. One small amber flame illuminates the metal from within. Its light
> reveals the faint suggestion of a stone passage behind it, but the passage
> recedes into something too vast to be a room. Five distant star points loosely
> echo the lantern's outline. A thin trace of pale smoke drifts sideways although
> the flame is perfectly still. Keep the lantern large, complete, and unmistakable;
> place the mystery in the surrounding depth. Warm light held inside cool shadow.

**Avoid:** a genie lamp, a jack-o'-lantern, a modern camping lantern, a glowing orb.

**Revision notes:** Pending first image. Is the lantern legible at card size?

### 02. The Briar

- **Stored ID:** `grove`
- **Suggested file:** `birthsign-grove.webp`
- **Palette:** deep forest green, verdigris, olive, old ivory.
- **Meaning:** endurance; knowledge concealed beneath cultivated ground.

**Image prompt**

> A single ancient briar branch curves into an incomplete circle against a deep
> green dusk. Its thorns are long but naturally irregular, its bark weathered,
> and a few small leaves catch a subdued ivory light. The bottom of the branch
> divides into exposed roots that vanish into suspended darkness rather than a
> visible pot or patch of soil. In the empty center, a handful of faint stars
> suggests a depth greater than the surrounding sky. One pale unopened bud grows
> where the two ends nearly meet. The silhouette should read as a thorned,
> almost-closed ring, spare and deliberate, with the bud as a secondary discovery.

**Avoid:** a floral wreath, a heart shape, a lush garden scene, decorative vines everywhere.

**Revision notes:** Pending first image. Keep it distinct from the Root Seer landscape.

### 03. The Wyrm

- **Stored ID:** `ember`
- **Suggested file:** `birthsign-ember.webp`
- **Palette:** oxblood, charcoal plum, aged copper, banked ember orange.
- **Meaning:** appetite; the discipline and danger of tending flame.

**Image prompt**

> The silhouette of an immense wingless wyrm coils once through a charcoal-plum
> celestial field. Its body is long and serpentine, with old copper-colored scales
> and a heavy, unmistakably reptilian head. The coil remains open; the creature
> does not bite its tail. A narrow seam of banked ember light follows the underside
> of its throat, illuminating only a few scales. Its mouth is closed. Sparse star
> points mark the curve of the spine, making it uncertain whether this is an
> animal or an arrangement of distant lights. Convey contained heat and ancient
> appetite, not an attacking monster. Keep the full coil comfortably inside the frame.

**Avoid:** a flying dragon battle, fire breath, a heraldic crest, resemblance to Veyr's small companion portrait.

**Revision notes:** Pending first image. Does it feel monumental rather than aggressive?

### 04. The Watcher

- **Stored ID:** `celestial`
- **Suggested file:** `birthsign-celestial.webp`
- **Palette:** ink blue, slate, faded silver, distant cold starlight.
- **Meaning:** observation; the possibility that the heavens observe in return.

**Image prompt**

> A tall, empty stone observatory arch stands alone against an ink-blue celestial
> expanse. Within its opening, one distant pale star occupies the exact position
> where an eye might be. The arch has no carved face; its two weathered uprights
> and slightly bowed lintel merely suggest the bearing of a silent sentinel.
> Fine silver light brushes one inner edge while the other remains dark. A few
> smaller stars surround the structure but none appear inside its opening except
> the solitary central point. Give the arch a clean, austere silhouette and let
> the impossible depth beyond it carry the unease. Nothing announces whether
> the structure frames the star or is looking through it.

**Avoid:** a literal giant eyeball, an eye-in-a-triangle symbol, a hooded villain, a telescope-filled room.

**Revision notes:** Pending first image. Does the sentinel association read without a face?

### 05. The Sunbearer

- **Stored ID:** `sunroom`
- **Suggested file:** `birthsign-sunroom.webp`
- **Palette:** ochre, honey gold, warm umber, pale wheat.
- **Meaning:** provision; warmth maintained through difficult seasons.

**Image prompt**

> Two strong, weathered human hands rise from the lower darkness, palms upward,
> bearing a shallow earthenware bowl. A small sun rests just above the bowl,
> suspended like a weight the hands have learned to carry. Its subdued golden
> light reveals chipped clay, creases in the fingers, and the simple cuffs of a
> linen garment. Keep all fingers anatomically natural and the entire gesture
> within the central composition. The sun is a textured, luminous disc rather
> than an explosive flare. Beyond it lies an ochre-brown twilight with a few
> nearly extinguished stars. Convey generosity as patient labor: warmth carried
> for others, without triumph or spectacle.

**Avoid:** religious halos, royal crowns, superhero poses, blazing white highlights, extra fingers.

**Revision notes:** Pending first image. Inspect hand anatomy and small-size clarity.

### 06. The Drowned

- **Stored ID:** `tidepool`
- **Suggested file:** `birthsign-tidepool.webp`
- **Palette:** deep petrol blue, sea green, oxidized bronze, salt white.
- **Meaning:** remembrance; what the sea keeps and what it returns.

**Image prompt**

> A solitary bronze bell hangs entirely beneath still, dark seawater. Its rounded
> silhouette is broad and immediately readable, its surface worn smooth in places
> and encrusted with pale salt and sparse mineral growth elsewhere. A frayed rope
> rises out of view. Thin shafts of muted sea-green light descend from a distant
> surface. Beneath the bell's open mouth, a few suspended points of light resemble
> stars rather than bubbles. No seabed is visible. The bell's clapper is still,
> but a faint circular disturbance spreads around it as though a sound has just
> passed through the water. Make the emptiness surrounding the bell feel deep,
> patient, and inhabited only by memory.

**Avoid:** human remains, a drowning person, shipwreck clutter, tentacles, tropical turquoise water.

**Revision notes:** Pending first image. Is the submerged bell a strong enough omen?

### 07. The Chalice

- **Stored ID:** `berry`
- **Suggested file:** `birthsign-berry.webp`
- **Palette:** dark mulberry, tarnished silver, muted rose, wine-black.
- **Meaning:** ancient hospitality; an invitation whose recipient is unknown.

**Image prompt**

> One plain, time-worn silver chalice stands against a deep mulberry celestial
> field. Its stem is slender, its bowl broad, and its rim gently uneven from years
> of use. A quiet rose-colored light catches the left edge. The cup is empty,
> yet its dark interior reflects several stars that do not appear in the sky
> behind it. Beneath the base, the suggestion of a table dissolves into shadow
> before any room becomes visible. Keep ornament limited to one shallow band
> around the stem, without writing or gemstones. The image should feel like a
> place has been prepared for a guest who has not arrived for a very long time.

**Avoid:** blood, overflowing wine, jeweled treasure, a trophy, a celebratory banquet.

**Revision notes:** Pending first image. Preserve the empty cup and restrained hospitality.

### 08. The Pale Hart

- **Stored ID:** `frost`
- **Suggested file:** `birthsign-frost.webp`
- **Palette:** blue-grey, bone white, winter silver, desaturated slate.
- **Meaning:** stillness; survival without surrendering gentleness.

**Image prompt**

> A pale adult stag stands in three-quarter profile across a blue-grey field of
> winter darkness. Its head turns slightly toward the viewer, alert but calm.
> Its natural branching antlers are complete and clearly separated from the
> background, with a few faint stars resting at their tips. The animal's coat
> is warm ivory in the light, never pure featureless white. A low band of mist
> obscures the ground without swallowing its legs. No breath rises from its
> nostrils despite the suggestion of bitter cold. Render a living, dignified
> creature with believable anatomy, a quiet dark eye, and the stillness of
> something seen only once at the edge of a long winter.

**Avoid:** skeletal deer, glowing red eyes, skull masks, excessive antler branches, Christmas imagery.

**Revision notes:** Pending first image. Keep the antlers safe in both master and banner crops.

### 09. The Moth

- **Stored ID:** `moth`
- **Suggested file:** `birthsign-moth.webp`
- **Palette:** smoky amber, charcoal, faded umber, ash grey.
- **Meaning:** the unaligned omen; curiosity that changes the seeker.

**Image prompt**

> A large ash-colored moth hangs motionless against charcoal darkness, wings
> spread in a clear, nearly symmetrical silhouette. Its wings are broad and
> naturally patterned in faded umber, with delicate scales and slightly worn
> edges. Soft amber light reaches it from an unseen source below the frame.
> The wing markings almost suggest two distant doorways, but remain plausible
> insect markings rather than painted symbols. Fine dust drifts from one wing
> and catches the light. Unlike the other omens, place no orderly constellation
> behind it; leave a conspicuously quiet patch of sky. The moth appears drawn
> toward something neither it nor the viewer should quite be able to see.

**Avoid:** a butterfly, a skull pattern, literal human eyes on wings, neon bioluminescence, a cute insect face.

**Revision notes:** Pending first image. Does it belong to the set while feeling unaligned?

---

## II. Callings

### Category composition instructions

> Paint an inhabited place of practice, temporarily without its keeper. Tell us
> who works here through a small number of tools, materials, and signs of use.
> Compose at worktable height, with a strong foreground anchor and one quieter
> opening into background space. Use a landscape 3:2 master that remains coherent
> when cropped to a wide 2:1 banner. Avoid important details at the top or bottom.
> No portrait, title, occupational emblem, or signage. The environment itself
> should identify the calling.

### 10. Hedge Witch

- **Stored ID:** `kitchen-witch`
- **Suggested file:** `calling-kitchen-witch.webp`
- **Palette:** moss green, old walnut, linen cream, low candle amber.
- **Visual anchor:** a worn mortar beneath hanging herbs.

**Image prompt**

> Inside a small cottage at the boundary of an old orchard, a low wooden worktable
> holds a heavy stone mortar, a pruning knife, a folded linen cloth, and three
> freshly cut herb stems. A few restrained bundles of drying plants hang above
> one side of the table. Place the mortar prominently near the center, its rim
> polished by generations of hands. One tallow candle warms the foreground while
> a small unglazed window admits green-grey evening light. Beyond the window,
> the orchard branches bend toward the house despite the stillness of the herbs
> indoors. This is a working kitchen, modest and cared for, with knowledge acquired
> through long attention rather than theatrical spellcasting.

**Avoid:** pointed hats, broomsticks, a bubbling green cauldron, an overflowing apothecary shop.

**Revision notes:** Pending first image. Keep it domestic and distinct from the Alchemist.

### 11. Ashkeeper

- **Stored ID:** `hearthkeeper`
- **Suggested file:** `calling-hearthkeeper.webp`
- **Palette:** soot black, iron grey, ember red, weathered ochre.
- **Visual anchor:** an iron pot above carefully banked coals.

**Image prompt**

> A broad stone cooking hearth in an old communal hall, viewed close enough to
> see the powdery ash on its ledge. A soot-darkened iron pot hangs just above a
> small, carefully banked bed of red coals. Beside it lie iron tongs and a folded
> heavy cloth, arranged with the economy of daily use. Warm light reveals a
> thousand small scratches on the pot; the surrounding stone absorbs most of
> the glow. At the back of the hearth, the ash holds one clean, narrow channel
> whose origin is unclear. The room beyond remains quiet and mostly unseen.
> Convey stewardship of a fire that has outlasted its builders, practical skill,
> and the comfort of heat kept alive through the night.

**Avoid:** a blacksmith's forge, weapons, roaring infernos, lava, a luxurious modern fireplace.

**Revision notes:** Pending first image. The pot and coals must remain readable at banner size.

### 12. Alchemist

- **Stored ID:** `herb-druid`
- **Suggested file:** `calling-herb-druid.webp`
- **Palette:** oxidized copper, smoky teal, cloudy amber glass, parchment.
- **Visual anchor:** a modest copper still and one receiving vessel.

**Image prompt**

> A compact copper distillation apparatus rests on a scarred oak table in a
> stone-walled room. Its simple curved pipe ends above a cloudy glass receiving
> vessel containing a small measure of amber liquid. Beside it sit a ceramic
> dish of dried peel, a balance weight, and an open folio whose annotations are
> only indistinct strokes, never legible writing. Cool light enters from a high
> window; a low burner supplies a localized warm glow. A single bead of liquid
> clings to the outside of the glass above the liquid line, an almost unnoticed
> irregularity. Make the apparatus hand-built, believable, and well maintained.
> The scene suggests patient transformation of culinary materials, not spectacle.

**Avoid:** neon potions, dozens of bottles, modern chemistry equipment, electrical instruments, explosive reactions.

**Revision notes:** Pending first image. Simplify tubing if it becomes visually confusing.

### 13. Ritualist

- **Stored ID:** `dough-artificer`
- **Suggested file:** `calling-dough-artificer.webp`
- **Palette:** wax ivory, dark wine, walnut brown, restrained candle gold.
- **Visual anchor:** a single prepared place setting within a salt circle.

**Image prompt**

> An old wooden table has been prepared for one absent guest. At its center are
> a plain ceramic bowl, a dark wooden spoon, and a folded piece of unbleached
> linen, carefully placed within a thin, imperfect circle of salt. Three short
> candles stand outside the circle, their flames small and steady. A loaf with
> one slice removed rests near the edge of the scene. The chair behind the bowl
> is pulled back slightly, though no person is present. Candlelight reveals the
> grain of the table and the quiet precision of the arrangement. The ritual feels
> like a domestic custom older than anyone remembers: hospitality repeated with
> exact care because no one wishes to find out why it matters.

**Avoid:** pentagrams, sacrificial implements, blood, masked figures, theatrical summoning effects.

**Revision notes:** Pending first image. Does it read as deliberate practice rather than ordinary dinner?

### 14. Root Seer

- **Stored ID:** `spice-alchemist`
- **Suggested file:** `calling-spice-alchemist.webp`
- **Palette:** peat brown, deep olive, root ivory, dim fungal green-grey.
- **Visual anchor:** the exposed root system of an ancient tree.

**Image prompt**

> At the exposed bank beneath an ancient orchard tree, thick roots twist through
> dark earth and fragments of old stone. View the bank closely at ground level,
> as a real eroded face rather than a labeled scientific cutaway. A small digging
> tool, a linen collecting pouch, and a freshly cleaned root rest on a flat stone
> in the foreground. Pale shelf fungi catch the last daylight beneath a major
> root. Farther back, the roots frame a narrow darkness whose geometry almost
> resembles a doorway, though it may only be an ordinary hollow. Keep the root
> forms organic and legible. Suggest someone learning to read the buried history
> of a place by studying what grows through it.

**Avoid:** a human face made of roots, a literal underground monster, a busy botanical diagram, neon mushrooms.

**Revision notes:** Pending first image. Keep the tools visible enough to imply a calling.

### 15. Crypt Warden

- **Stored ID:** `feast-bard`
- **Suggested file:** `calling-feast-bard.webp`
- **Palette:** limestone grey, cool umber, dull bronze, distant lamp amber.
- **Visual anchor:** a sealed storage vessel in a vaulted undercroft.

**Image prompt**

> A low vaulted undercroft beneath an old kitchen, built from pale stone blocks
> worn smooth along the passage. In the foreground, one substantial ceramic
> storage vessel sits on a stone shelf, its lid secured with dark wax and plain
> cord. A heavy bronze key lies beside it. A few further vessels recede in an
> orderly row, suggesting provisions kept through long winters. At the far end,
> an oil lamp illuminates a closed doorway; its light stops just short of the
> threshold. Keep the space dry, quiet, and tended rather than ruined. The keeper's
> task is preservation, but the viewer cannot be certain whether the seals protect
> the contents from the world or the world from the contents.

**Avoid:** coffins, skeletons, graveyard imagery, torture chambers, treasure piles, modern canning jars.

**Revision notes:** Pending first image. Balance the crypt atmosphere with culinary preservation.

---

## III. Familiars

### Category composition instructions

> Paint one named animal companion with believable anatomy and an individual
> presence. Use an intimate, eye-level three-quarter view, with the animal filling
> roughly two-thirds of the image width. Keep the face, ears, and defining body
> features inside the central safe area. Include a restrained environmental cue
> from its history, with soft background detail. The animal is alive, watchful,
> and neither a mascot nor a monster. Landscape 3:2 composition. No costumes,
> collars with lettering, human expressions, or decorative portrait frames.

### 16. Salem — Black Cat

- **Stored ID:** `cat`
- **Suggested file:** `familiar-cat.webp`
- **Identity anchors:** female black cat; short black coat; pale amber eyes; no white patches.
- **Palette:** blue-black fur, worn oak, candle amber, muted stone.

**Image prompt**

> Salem, a short-haired female black cat, sits on a worn wooden kitchen threshold
> with her body in three-quarter view. Her head is turned toward a closed door
> just outside the frame, ears attentive to something the viewer cannot hear.
> Her pale amber eyes catch a small reflection from the hearth. Use soft side
> lighting to reveal the contours and fine texture of her black coat without
> turning it grey or losing it against the background. Her tail curls naturally
> beside her paws. The room feels inhabited but still; the door's long shadow
> reaches toward her. Her composure suggests that she has recognized the visitor
> long before any knock. Natural feline proportions, quiet intelligence, no pose
> intended to look adorable.

**Avoid:** witch hats, green neon eyes, arched-back Halloween poses, smiling, extra tails.

**Revision notes:** Pending first image. Lock her eye color and facial proportions after approval.

### 17. Veyr — Dragon

- **Stored ID:** `dragon`
- **Suggested file:** `familiar-dragon.webp`
- **Identity anchors:** cat-sized dragon; four legs, two folded wings; dark copper scales; short swept-back horns.
- **Palette:** aged copper, charcoal, ember red, soot brown.

**Image prompt**

> Veyr, a small cat-sized dragon, rests in a loose coil beside the last glowing
> coal on a broad stone hearth. Give the creature four clearly structured legs,
> two leathery wings folded close to its back, short swept-back horns, and a
> long tail lying within the frame. Its scales are dark, worn copper, with
> restrained amber light catching the throat and cheek. One eye is half open,
> watchful rather than sleepy or playful. Place an ordinary iron ladle nearby
> to establish the dragon's modest scale. The coal illuminates only a small
> pocket of warmth; the rest of the hearth is ash and cool stone. Veyr appears
> to be guarding the ember, or perhaps quietly keeping it alive.

**Avoid:** baby-dragon proportions, huge eyes, fire breath, extra limbs, colossal scale, armor.

**Revision notes:** Pending first image. Check limb and wing anatomy; distinguish Veyr from The Wyrm.

### 18. Orin — Owl

- **Stored ID:** `owl`
- **Suggested file:** `familiar-owl.webp`
- **Identity anchors:** barn owl; ivory heart-shaped facial disc; dark eyes; tawny-grey wings.
- **Palette:** ivory, weathered tawny brown, slate blue, dim amber.

**Image prompt**

> Orin, an adult barn owl, has just settled on the broad inner sill of a narrow
> stone window at dusk. His wings are folded and his body is angled slightly
> away, while his ivory heart-shaped face turns toward the viewer. Render the
> dark eyes without a supernatural glow and the tawny-grey feathers with soft,
> layered detail. A faint trace of pale dust clings to the outer wing feathers,
> suggesting a passage through an undisturbed room. Behind him, a closed wooden
> shutter bears old iron fittings; beyond the window lies blue evening. The
> kitchen's low amber light touches one side of his face. His expression is
> observant and unreadable, as though he has returned with knowledge he cannot
> put into human words.

**Avoid:** spectacles, books held in talons, exaggerated wise expressions, horned-owl ear tufts.

**Revision notes:** Pending first image. Preserve the facial disc and natural dark eyes.

### 19. Vesper — Fox

- **Stored ID:** `fox`
- **Suggested file:** `familiar-fox.webp`
- **Identity anchors:** adult red fox; dark lower legs; white throat; white-tipped single tail.
- **Palette:** rust red, bark brown, dusk green, faded silver.

**Image prompt**

> Vesper, a lean adult red fox, pauses where a narrow orchard path enters an
> older wood. Show the fox's body side-on in a gentle three-quarter angle, head
> turned back toward the viewer. One front paw is slightly lifted as if the
> animal has stopped to wait. Its rust-red coat is muted by dusk, with dark
> lower legs, a pale throat, and one full tail with a white tip. Roots cross
> the path, but the route beyond is only faintly visible. A small gap in the
> branches admits silver light onto the fox's face. Vesper's gaze should feel
> patient and questioning: a guide that expects the traveler to remember
> something, rather than a pet asking to be followed.

**Avoid:** multiple tails, human smiles, ornamental harnesses, bright autumn postcard scenery.

**Revision notes:** Pending first image. Keep the backward glance clear in a small crop.

### 20. Morrow — Frog

- **Stored ID:** `frog`
- **Suggested file:** `familiar-frog.webp`
- **Identity anchors:** broad-bodied frog; mottled olive skin; bronze eyes; natural proportions.
- **Palette:** wet slate, dark olive, moss grey, dull bronze.

**Image prompt**

> Morrow, a broad-bodied olive frog, rests on the worn rim of an old stone well
> beneath a kitchen cellar. Work at the frog's eye level so its compact form
> feels substantial without enlarging it into a giant creature. Its mottled
> skin has a soft damp sheen, its bronze eyes are steady, and its folded legs
> are anatomically clear. A little moss grows in the stone seam beside it.
> Reflected lamplight from outside the image reveals the edge of the well;
> the water below remains dark and still. One faint circular ripple is visible
> despite the frog's complete immobility. Convey a companion that belongs to
> the house, but seems older than anything built around it.

**Avoid:** a crown, a grin, bulging cartoon eyes, a potion bottle, glowing slime, extra toes or legs.

**Revision notes:** Pending first image. Keep the frog readable against the damp stone.

### 21. Luna — Rabbit

- **Stored ID:** `rabbit`
- **Suggested file:** `familiar-rabbit.webp`
- **Identity anchors:** pale ivory rabbit; upright ears; dark brown eyes; softly grey ear tips.
- **Palette:** warm ivory, winter earth, frost grey, soft moon blue.

**Image prompt**

> Luna, a pale ivory rabbit, sits among the exposed roots at the base of an old
> orchard tree in late winter. Her ears are upright with softly grey tips, her
> eyes dark brown, and her body compact with believable rabbit proportions.
> A thin crust of frost covers the soil around her, undisturbed by footprints.
> Keep her fur warmer than the surrounding blue-grey light so the animal
> separates gently from the scene. A sheltered hollow between two roots lies
> behind her, too dark to reveal its depth. She looks slightly past the viewer,
> calm and attentive. The image should initially offer the comfort of a living
> creature in a cold place; only later should the absence of tracks feel strange.

**Avoid:** red albino eyes, a crescent painted on the forehead, fairy wings, enormous ears, plush-toy proportions.

**Revision notes:** Pending first image. Keep her pale coat detailed, not blown out or pure white.

---

## Review and revision log

For each candidate, check:

- Can we recognize the subject without reading its name?
- Does it match the approved set in brushwork, contrast, and level of detail?
- Is the focal point readable at the actual selector-card size?
- Do the intended crops preserve ears, antlers, wings, and identifying tools?
- Is the unease subtle enough that the scene still feels inhabitable?
- For Familiars, does anatomy remain believable and identity stay consistent?

Append one row per review. Keep rejected directions in this log rather than
silently losing the reason for a change.

| Entry       | Prompt revision / candidate | What works                                       | What to change next               | Status |
| ----------- | --------------------------- | ------------------------------------------------ | --------------------------------- | ------ |
| All entries | R1 / no images yet          | Initial shared direction and full roster drafted | Review concepts before generation | Draft  |

Suggested first anchors: **The Lantern**, **Hedge Witch**, and **Salem**. Approve
their material treatment and lighting, then carry those decisions across each set.

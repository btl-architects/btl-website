# Thressia’s website feedback — implementation plan

Prepared 2 October 2026. Local implementation is now complete on
`codex/client-feedback`. See [implementation results](client-feedback-implementation-2026-10-02.md)
for verification and remaining release checks. Publication and live content edits
remain pending.

## What was reviewed

Read Thressia’s website messages from **1 October**, including the final Press explanation at 4:05 PM, and the relevant **2 October follow-ups through 4:54 PM**. Opened the screenshots and supplied magazine covers at full size: 15 media items across those two days, including the developer’s screenshot explaining deletion. Today’s additions are identified separately below.

**Scope correction from Ouseph:** “only need to worry about things after the voice note, rest have already been addressed.” The active plan therefore starts after the two voice notes at **12:37 PM on 1 October**. Earlier team density, Alumni creation and the original bold Thank-you request are treated as addressed and are not reopened. The voice notes and earlier deleted messages are outside the revised scope; no transcript is needed. Call contents are unavailable and no requests are inferred from them.

Compared the feedback with the clean local checkout at **6155725**. Findings below are from source inspection; they do not establish which version is currently deployed or whether the live publish/rebuild connection is working. No website code, CMS records, or WhatsApp messages were changed during this review.

Thressia mentioned a possible **7 October launch**, the office’s first birthday. Treat that as the target for review and preparation, with launch dependent on acceptance and the existing production checks.

## Feedback register

| ID | Source, local time | What she wants | Current finding and proposed result |
| --- | --- | --- | --- |
| F02 | 2 Oct, 12:02 | Past people’s photos should update | Alumni already exists. Its website template currently renders names and roles without portraits. Reuse the Team portrait-card rendering for Alumni, preserving the settled layout and labels. Check the publish/rebuild path separately if an updated asset still fails to appear. |
| F03 | 2 Oct, 11:34 | Role should be optional under her and Faizan’s names | The schema requires every person’s role; Home, People and profiles render the role unconditionally. Allow principals to publish without one, omit the empty role element, and preserve names, prefixes, biographies and links. Keep existing Team/Alumni requirements unless there is a reason to relax them. |
| F04 | 1 Oct, 12:44 | Page headings are too large, illustrated with Projects | Give ordinary page titles a consistent, quieter size. Start the preview around 28–40px across phone/desktop, then judge it beside the photographs. Check Projects, Press and Contact together; preserve the settled Thank-you styling, heading hierarchy and the distinct homepage statement treatment. The earlier Thank-you weight complaint is already addressed. |
| F05 | 2 Oct, 12:15 | Navigation font should be thinner | Navigation is currently weight 500. Preview weight 400 in the existing font. Retain spacing, current-page underline, keyboard focus, mobile menu behaviour and readability over the opening film. |
| F06 | 1 Oct, 12:40 | “Everyone at btl” and “Send an enquiry” should be grey | Add an explicitly quieter link treatment at these homepage call sites, using the existing secondary text colour. Keep hover/focus states clear and check contrast. Avoid changing every onward link merely because the component is shared. |
| F07 | 1 Oct, 4:04–4:05 | Custom Press images, such as the supplied ELLE DECOR and AD covers; no repeated project photograph | Confirmed: `Credit` always uses the related project’s cover; the editor only exposes a small masthead/logo image. Add a separate **Press image** field and render it prominently on Home and Press. Display the whole magazine cover without cropping its lettering. Related project remains a relationship, not the image selector. |
| F09 | 2 Oct, 12:31 and 4:54 | Drag People and Projects into a chosen order; project ordering currently cannot be changed | Both types have numeric order fields, but Studio exposes ordinary document lists, not drag ordering. Add a dedicated ordering view with drag handles and keyboard Move up/down controls. Reuse the existing `order` field, and make public query ordering deterministic. Validate saving, publishing and rebuilding end to end. |
| F10 | 2 Oct, 12:30 | Homepage statement should appear/fade in as she scrolls down | This already uses `.rv`, with an observer, a 700ms fade/slide and a visibility fallback. Verify on the actual deployed version and normal-motion preview before changing it. Tune that statement’s trigger/timing only if needed; retain immediate visibility with reduced motion or unavailable scripts. |
| F11 | 2 Oct, 12:33 | Explain Cover, Photograph and Drawing | Current help explains only Cover. Add plain examples beside the choices and to the editing guide. Cover is the single opening image; Photograph is an ordinary gallery photo; Drawing is a plan/section/elevation image. Currently Drawing remains in the shared gallery, so do not promise a separate drawings section. Hide project-only role controls from portraits and Press images through schema context, while preserving stored image objects. |

**Closed or informational:** F01 (team density) and the earlier Alumni/Thank-you requests are already addressed per Ouseph. F08 (deleting dummy Press entries, 12:49 PM) was answered with the developer’s screenshot and acknowledged at 1:03 PM. Include that answer in the guide; no automatic deletion is planned. The visible “null” document title is a small editor fallback improvement to include with the Press work, not a new client design request.

## Implementation sequence

### 1. Establish the preview and record the starting state

Create a `codex/` branch from the current checkout. Capture Home, Projects, Press, People, Contact and Thank-you at 375, 768 and 1440px, plus a 320px overflow check. Record the current published project/person order and relevant image references before any content edits. Read the deployed revision and confirm whether the client was looking at production or a draft preview.

Run the existing checks once to establish a baseline. Record existing failures separately so this work cannot silently inherit or disguise them. Use previews that cannot send real enquiries. A real delivery check belongs to the final production verification, with an explicitly authorised test.

### 2. Fix the editor controls and data contract

Address **F03, F07, F09 and F11** together because they affect both authoring and rendering.

- Add optional `publication.image` using the existing image object, separate from `logo`. Rename editor labels to distinguish “Press image / magazine cover” and “Publication logo”. Replace the outdated description saying the project photograph rises on hover. Include the new image in the explicit content projection and image validation/warming path.
- Make role validation conditional for principals, normalise missing roles, and prepare conditional rendering in all three public contexts. A blank principal role must not produce a publishing error or an empty line.
- Add ordering views for Projects and People. For People, show Principals, Team and Alumni as distinct groups so moving a row does not move someone into another section. Keep hidden people and archived projects identifiable rather than discarding them.
- Prefer a small Studio ordering component using the existing numeric positions. Dragging changes pending order; saving/publishing must be an explicit, understandable step with error reporting. Preserve unrelated drafts, use revision checks for concurrent editors, and avoid partially applied order changes. A keyboard user must be able to do everything a pointer user can do.
- Sort using the chosen position plus a stable identifier for ties; treat missing positions consistently. Check Home’s selected work, the project index, filtered indexes and any navigation derived from these lists. Studio “last edited” sorting must not be confused with website order.
- Explain image purposes where they apply. The shared figure object currently uses building-specific help even for portraits. Provide context-appropriate guidance without renaming stored fields or forcing a data migration.

Do not add compulsory fields to existing records. Deploy the compatible schema/frontend pair before asking the client to populate the new field. Public ordering and imagery should remain stable until the associated content is deliberately published and its build succeeds.

### 3. Fix shared presentation in small changes

**People first (F02–F03):** extract one reusable person card, including optional portrait and profile link. Use it for Team and Alumni without revising the previously settled density or headings. Keep empty sections hidden. Verify one, two, three, four and seven entries so incomplete rows retain their intended layout. Test long names, missing portraits, empty principal roles and a person with a biography. The screenshot also shows similarly named founder records: investigate whether these are deliberate before treating them as duplicates; do not delete them automatically.

**Press next (F07):** use the custom image as the main visual on both pages. Add a cover presentation that fits the whole image within its frame; project-photo cropping rules are unsuitable for magazine typography. Keep logos in their own small slot. Two publications for the same project must show different uploaded covers. Keep awards and entries without an image coherent and aligned.

Compatibility policy: existing entries can temporarily retain their project-image fallback until reviewed. Once custom covers are supplied for launch entries, remove that automatic dependency for those entries; an image-less new entry should have a deliberate text presentation, not an arbitrary project picture. Do not automatically move `logo` into `image`, since some records contain genuine logos. Review and copy a cover asset only for records where its purpose is confirmed. Preserve article URLs and related-project references.

**Typography and links (F04–F06):** use explicit page-title styles rather than reducing every type token. Check titles beside photographs on desktop and mobile; keep body text readable and the already addressed Thank-you presentation intact. Scope grey links to the requested homepage links. Review the lighter navigation over both a bright film frame and the dark page background.

**Motion last (F10):** reproduce normal scrolling first. The animation exists in the current source, so investigate deployed code, script delivery, motion preferences and reveal timing before introducing more code. If tuning is needed, keep it local to the homepage statement. No scroll hijacking, additional animation library or hidden-text dependency.

### 4. Make the editing workflow understandable

Update `docs/editing-guide.md` after the interfaces are settled. Its descriptions of hover portraits and Press imagery no longer match the current implementation, which contributes to the client’s confusion.

Add short instructions for: adding an Alumni portrait; leaving a principal’s role blank; uploading a full Press cover versus a logo; choosing one project cover; arranging People/Projects; publishing an order; and checking the completed site build. Explain that saving a draft, publishing content and finishing a website rebuild are separate events.

Carry the resolved F08 answer into the guide: show how to remove an entry from public view reversibly and where permanent Delete lives. Preserve referenced projects and people. Removing placeholders is a content choice; this review has not verified claims, image rights or selected records for deletion, consistent with Ouseph’s earlier scope.

### Files affected by the planned implementation

| Work | Primary files |
| --- | --- |
| Alumni portraits and optional founder roles | `studio/schemas/person.ts`, `web/src/lib/content.ts`, `web/src/pages/people/index.astro`, `web/src/pages/people/[slug].astro`, `web/src/pages/index.astro`; one shared person-card component |
| Independent Press imagery | `studio/schemas/publication.ts`, `web/src/lib/content.ts`, `web/src/components/Credit.astro`, `web/src/components/Masthead.astro`, `web/src/pages/press.astro`, `web/tools/content-check.mjs`; image helpers and warming if the new presentation needs different sizes |
| People/Project ordering | `studio/structure.ts`, a Studio ordering component, `studio/schemas/person.ts`, `studio/schemas/project.ts`, `web/src/lib/content.ts` |
| Page-title size, navigation weight, grey homepage links | `web/src/styles/tokens.css`, `web/src/styles/components.css`, `web/src/components/Onward.astro`, the relevant homepage call sites; scope styles to preserve settled treatments |
| Statement reveal diagnosis/tuning | `web/src/pages/index.astro`, `web/src/components/Statement.astro`, `web/src/styles/base.css`, `web/public/scripts/site.js` only if a change is justified |
| Editor guidance | `studio/schemas/objects.ts`, contextual field definitions, `docs/editing-guide.md` |

### 5. Verify and get the client’s visual acceptance

| Area | Required evidence before release |
| --- | --- |
| People | Alumni portraits render using the existing Team treatment; settled density and labels remain intact; narrow layouts remain readable; a replaced published Alumni portrait reaches the rebuilt preview. |
| Founder roles | Both principals can publish with blank roles; no empty label/gap appears on Home, People or an existing profile. |
| Press | The supplied cover examples fit without clipping; two entries linked to one project show independent images; logos, awards, missing images and links still work. |
| Ordering | Drag and keyboard reorder persist after reopening Studio; pending edits are distinguishable from published order; a completed build reflects that order consistently. No unrelated fields or draft edits are overwritten. |
| Typography | Before/after screenshots of Projects, Press and Contact, plus desktop/mobile navigation and the two homepage links. Confirm Thank-you retains its settled appearance. Contrast and focus remain clear. |
| Motion | Statement fades once on normal scrolling; remains visible with reduced motion, disabled scripts, fast scrolling, a background tab and browser Back/Forward. |
| Existing behaviour | Project open/close, photo viewer zoom, nested Escape, focus return, browser history, mobile menu, email/phone links, enquiry failure recovery and preview isolation still pass. |

Use the existing verification commands:

```sh
# web/
npm test
npm run build
npm run test:e2e
# Run the existing local test server before performance measurement.
npm run test:performance

# studio/
npx tsc --noEmit
npm run build
```

The build already checks content, redirects, output structure, budgets and image warming. Browser checks cover Chromium, Firefox and WebKit, accessibility, overflow and image sharpness. Add focused coverage for order persistence, optional principal roles and independent Press imagery; use visual inspection for simple weight/colour changes rather than tests that merely repeat CSS declarations. Run the full suite at the final integrated preview and again only when subsequent changes justify it.

Present one review set grouped by People, Press, typography and editing workflow. Client acceptance should include her ability to perform the common edits herself, not just screenshots of a finished page. Recheck each feedback ID against that review set.

## Release and rollback

Keep editor/data changes, People, Press, typography and motion in separate reviewable commits. Preserve existing slugs, document IDs, image references, redirect rules and project lifecycle behaviour. Export affected content before any authorised live reorder or cover reassignment; record the intended order and asset mapping.

Rehearse in a draft/branch preview. Confirm additive schema compatibility, then roll out the compatible editor and website. Publish chosen content changes only after preview acceptance. A failed build must leave the previous site live; do not bypass validation to meet the date.

If a stage regresses, revert its code commit and restore the previous deployment. Leave optional added fields in the dataset; old code can ignore them. Restore order values or image assignments from the recorded mapping only if those content edits caused the issue, preserving unrelated client edits. Do not use a whole-dataset overwrite as rollback.

Suggested scheduling, subject to client review: **2–3 Oct** editor controls and People; **3–4 Oct** Press and typography; **5 Oct** integrated checks and editing guide; **6 Oct** client acceptance and release rehearsal; **7 Oct** launch if accepted. This is a proposed sequence, not a deployment commitment.

## Checks during implementation

1. Compare the screenshot behaviour with the actual deployed version. In particular, “photo not updating”, “order not changing” and “fade not happening” can each involve publication/build state as well as presentation.
2. During the visual preview, settle the final page-title sizes and verify the earlier addressed People/Thank-you changes are preserved. Do not reopen the pre-voice-note requests based on this older screenshot set.
3. Confirm the launch records and cover assets when content is populated. Do not treat “launch on the 7th” or the deletion question as authorisation to publish or delete through this review.

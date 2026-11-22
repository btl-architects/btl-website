/* The IIID Kerala Design Awards 2026 entry for Nelly House.
 *
 * Kept as a DRAFT until the Recognition release is deployed, so the live site
 * does not show it early.
 *
 *   npx sanity exec scripts/add-iiid-award.ts --with-user-token
 *       creates the draft (if it does not exist yet)
 *   npx sanity exec scripts/add-iiid-award.ts --with-user-token -- --image <card.png>
 *       uploads the complete card artwork and sets it on the draft
 *   npx sanity exec scripts/add-iiid-award.ts --with-user-token -- --publish
 *       publishes the draft exactly as it stands (including Studio edits)
 *
 * Placeholders to replace in Studio when they arrive: the exact award date and
 * IIID's announcement link (the ceremony's Instagram post is embedded
 * meanwhile). The card artwork is in "btl brand and assets/005 Recognition
 * artwork". */
import {getCliClient} from 'sanity/cli';
import {createReadStream} from 'node:fs';
import {basename} from 'node:path';

const client = getCliClient({apiVersion: '2026-09-01'});
const id = 'award-iiid-kerala-2026-nelly-house';
const draftId = `drafts.${id}`;
const arg = (name: string) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;

const [published, draft] = await Promise.all([client.getDocument(id), client.getDocument(draftId)]);

if (process.argv.includes('--publish')) {
  if (!draft) throw new Error(published ? 'Already published, with no draft changes.' : 'No draft to publish.');
  const {_rev, _createdAt, _updatedAt, ...content} = draft as any;
  await client.transaction().createOrReplace({...content, _id: id}).delete(draftId).commit();
  console.log(`Published ${id}.`);
} else if (arg('--image')) {
  const file = arg('--image')!;
  const target = draft ? draftId : published ? id : null;
  if (!target) throw new Error('Create the entry first.');
  const asset = await client.assets.upload('image', createReadStream(file), {filename: basename(file)});
  await client.patch(target).set({
    useProjectImage: false,
    // Hotspot at the photograph's centre (x 0.618), as on the ELLE DECOR and
    // AD cards, so the caption sits beneath the photograph.
    image: {_type: 'figure', alt: 'IIID Design Awards card with an aerial view of Nelly House', rights: 'owned',
      asset: {_type: 'image', asset: {_type: 'reference', _ref: asset._id},
        hotspot: {_type: 'sanity.imageHotspot', x: 0.618, y: 0.5, width: 0.75, height: 1}}},
  }).commit();
  console.log(`Card ${asset._id} set on ${target}.`);
} else {
  if (draft || published) throw new Error('The entry already exists; edit it in Studio.');
  const project = await client.fetch('*[_type == "project" && slug.current == "nelly-house"][0]._id');
  if (!project) throw new Error('Nelly House project not found.');
  await client.create({
    _id: draftId, _type: 'publication', kind: 'award',
    publication: 'IIID Kerala Design Awards 2026', short: 'IIID Kerala 2026', title: 'Gold, Single Dwelling',
    slug: {_type: 'slug', current: 'iiid-kerala-design-awards-2026-nelly-house'},
    date: '2026-11-22', useProjectImage: true, openingMode: 'embed',
    url: 'https://www.instagram.com/p/DfwpIUPn8R9/',
    relatedProject: {_type: 'reference', _ref: project},
  });
  console.log(`Draft ${draftId} written.`);
}

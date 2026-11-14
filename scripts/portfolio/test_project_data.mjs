import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProject, cover } from '../../src/concepts/practice/projectData.ts';

const SIGUIDE = '7b4a9961-a088-46f4-bc88-8f0d64589227';
const NOODLE = 'e7149d46-fad6-477b-a91c-77e76723df7d';
const AGENTIC_OS = 'd8307ba2-cc0e-4fc5-bc00-48fd5458dd08';

const media = overrides => ({ image_url: 'https://cdn.test/a.png', caption: null, media_type: 'image', video_thumbnail_url: null, display_order: null, is_primary: false, ...overrides });
const row = overrides => ({ id: 'p1', title: 'A project', client: 'Client', description: 'About it.', involvement: 'Lead', year: 2020, liveurl: null, unlisted: false, project_tags: [], project_images: [], ...overrides });

test('the Smithsonian case spells SiGuide the same way in every field', () => {
  const project = normalizeProject(row({
    id: SIGUIDE, title: 'Smithsonian Guide Device (SIguide)', involvement: 'Built the siguide app.', description: 'SIGUIDE was a device.',
    project_images: [media({ caption: 'Siguide home screen' })],
  }));
  assert.equal(project.title, 'Smithsonian Guide Device (SiGuide)');
  assert.equal(project.involvement, 'Built the SiGuide app.');
  assert.equal(project.description, 'SiGuide was a device.');
  assert.equal(project.project_images[0].caption, 'SiGuide home screen');
});

test('other projects keep their own spelling', () => {
  assert.equal(normalizeProject(row({ title: 'SIguide notes' })).title, 'SIguide notes');
});

test('Noodle’s closing note reads as historical work', () => {
  const project = normalizeProject(row({ id: NOODLE, description: 'Founded in 2023. Noodle is closed to new sign ups but still servicing a number of patients who entrusted their information to the service.' }));
  assert.equal(project.description, 'Founded in 2023. Noodle has since dissolved. This is historical work.');
});

test('tags flatten and skip missing names', () => {
  const project = normalizeProject(row({ project_tags: [{ tags: { name: 'AI' } }, { tags: null }, { tags: { name: 'Healthcare' } }] }));
  assert.deepEqual(project.tags, ['AI', 'Healthcare']);
});

test('media sorts by display order with unordered items last', () => {
  const project = normalizeProject(row({ project_images: [media({ image_url: 'c' }), media({ image_url: 'b', display_order: 2 }), media({ image_url: 'a', display_order: 0 })] }));
  assert.deepEqual(project.project_images.map(item => item.image_url), ['a', 'b', 'c']);
});

test('a missing description becomes empty text and an empty contribution becomes null', () => {
  const project = normalizeProject(row({ description: null, involvement: '' }));
  assert.equal(project.description, '');
  assert.equal(project.involvement, null);
});

test('cover prefers the curated image, then the primary, then the first, and uses video thumbnails', () => {
  const curated = normalizeProject(row({ id: AGENTIC_OS, project_images: [media({ image_url: 'first', display_order: 0, is_primary: true }), media({ image_url: 'curated', display_order: 9 })] }));
  const primary = normalizeProject(row({ project_images: [media({ image_url: 'first', display_order: 0 }), media({ image_url: 'primary', display_order: 1, is_primary: true })] }));
  const only = normalizeProject(row({ project_images: [media({ image_url: 'only', display_order: 0 })] }));
  const video = normalizeProject(row({ project_images: [media({ image_url: 'movie.mp4', media_type: 'video', video_thumbnail_url: 'poster.jpg' })] }));
  assert.equal(cover(curated), 'curated');
  assert.equal(cover(primary), 'primary');
  assert.equal(cover(only), 'only');
  assert.equal(cover(video), 'poster.jpg');
  assert.equal(cover(normalizeProject(row())), undefined);
});

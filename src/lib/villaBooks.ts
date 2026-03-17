// Villa book data — loaded from markdown files in src/content/villa-books/
// Each villa corresponds to one hut on the island.
// The teaser_video and other metadata come from YAML frontmatter.
// Body content (intro narrative) is the markdown body after the frontmatter.

export interface VillaBook {
  slug: string;
  company: string;
  role: string;
  years: string;
  color: string;          // hex color for hut roof
  teaserVideo: string;    // URL to a short looping video shown above hut
  clientMatch: string;    // matches against Supabase projects.client (empty = no DB lookup)
  intro: string;          // markdown body text
}

// Raw markdown strings — loaded at build time via Vite's import.meta.glob
const rawFiles = import.meta.glob('../content/villa-books/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      data[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
    }
  }

  return { data, content: match[2].trim() };
}

export const VILLAS: VillaBook[] = Object.entries(rawFiles).map(([filePath, raw]) => {
  const slug = filePath.split('/').pop()!.replace('.md', '');
  const { data, content } = parseFrontmatter(raw);

  return {
    slug,
    company: data.company ?? slug,
    role: data.role ?? '',
    years: data.years ?? '',
    color: data.color ?? '#888888',
    teaserVideo: data.teaser_video ?? '',
    clientMatch: data.client_match ?? '',
    intro: content,
  };
}).sort((a, b) => {
  // Canonical order matching island layout
  const order = ['google', 'included-health', 'gigwalk', 'noodle', 'recent-projects'];
  return order.indexOf(a.slug) - order.indexOf(b.slug);
});

export const VILLA_BY_SLUG = Object.fromEntries(VILLAS.map(v => [v.slug, v]));

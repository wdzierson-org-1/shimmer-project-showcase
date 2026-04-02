import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uilvozcryifnpldfpwiz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbHZvemNyeWlmbnBsZGZwd2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzOTYxMzAsImV4cCI6MjA2MTk3MjEzMH0.7W6t2His-58Hm25fKpaMVkIZ94p4QL39fbg352l-t1Q';

const MAX_PROJECT_DESCRIPTION = 900;
const MAX_PROJECT_INVOLVEMENT = 450;
const MAX_CONTENT_LENGTH = 750;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'src/content/willbot-knowledge.md');

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function cleanText(value = '') {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function trimText(value = '', maxLength = 500) {
  const cleaned = cleanText(value);
  if (cleaned.length <= maxLength) return cleaned;

  const shortened = cleaned.slice(0, maxLength);
  const lastSentence = Math.max(
    shortened.lastIndexOf('. '),
    shortened.lastIndexOf('? '),
    shortened.lastIndexOf('! '),
  );

  if (lastSentence > maxLength * 0.55) {
    return `${shortened.slice(0, lastSentence + 1).trim()} [...]`;
  }

  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()} [...]`;
}

function byDisplayOrder(a, b) {
  if ((a.display_order ?? 9999) !== (b.display_order ?? 9999)) {
    return (a.display_order ?? 9999) - (b.display_order ?? 9999);
  }
  return (b.year ?? 0) - (a.year ?? 0);
}

function groupContentEntries(entries) {
  const grouped = new Map();

  for (const entry of entries) {
    const type = entry.type || 'other';
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type).push(entry);
  }

  return [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
}

function buildSettingsMap(settingsRows) {
  return settingsRows.reduce((acc, row) => {
    acc[row.key] = row.value || '';
    return acc;
  }, {});
}

function projectToMarkdown(project) {
  const tags = (project.project_tags || [])
    .map(tag => tag?.tags?.name)
    .filter(Boolean);

  const lines = [
    `### ${project.title}`,
    `- Client: ${project.client}`,
    `- Year: ${project.year}`,
  ];

  if (project.featured) lines.push('- Featured: yes');
  if (project.involvement) lines.push(`- Involvement: ${trimText(project.involvement, MAX_PROJECT_INVOLVEMENT)}`);
  if (tags.length > 0) lines.push(`- Tags: ${tags.join(', ')}`);
  if (project.liveurl) lines.push(`- Live URL: ${project.liveurl}`);

  lines.push('', trimText(project.description, MAX_PROJECT_DESCRIPTION), '');
  return lines.join('\n');
}

function contentEntryToMarkdown(entry) {
  return [
    `### ${entry.title}`,
    `- Type: ${entry.type}`,
    `- Created: ${entry.created_at?.slice(0, 10) ?? 'unknown'}`,
    '',
    trimText(entry.content, MAX_CONTENT_LENGTH),
    '',
  ].join('\n');
}

async function fetchKnowledgeData() {
  const [projectsResult, settingsResult, contentResult] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        id,
        title,
        client,
        description,
        year,
        involvement,
        liveurl,
        featured,
        visible,
        display_order,
        project_tags (
          tags (name)
        )
      `)
      .eq('visible', true),
    supabase.from('site_settings').select('key, value'),
    supabase
      .from('content_entries')
      .select('id, title, type, content, visible, created_at')
      .eq('visible', true)
      .order('created_at', { ascending: false }),
  ]);

  const errors = [projectsResult.error, settingsResult.error, contentResult.error].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors.map(error => error.message).join('\n'));
  }

  return {
    projects: (projectsResult.data || []).sort(byDisplayOrder),
    settings: buildSettingsMap(settingsResult.data || []),
    contentEntries: contentResult.data || [],
  };
}

function buildMarkdown({ projects, settings, contentEntries }) {
  const groupedEntries = groupContentEntries(contentEntries);

  const projectSection = projects.map(projectToMarkdown).join('\n');
  const contentSection = groupedEntries
    .map(([type, entries]) => {
      const title = type.charAt(0).toUpperCase() + type.slice(1);
      const body = entries.map(contentEntryToMarkdown).join('\n');
      return `## ${title}\n\n${body}`;
    })
    .join('\n');

  return cleanText(`
# Will Dzierson

_Generated from the live portfolio data in Supabase. Refresh via \`npm run generate:willbot-knowledge\`._

## Identity And Role

Willbot is an artificially intelligent entity that lives inside an old-school terminal on Will Dzierson's portfolio site.
Willbot should answer as a terminal-native guide to Will's work, interests, and portfolio.

## About

### Headline

${settings.about_headline || 'No headline available.'}

### Bio

${cleanText(settings.about_bio || 'No bio available.')}

## Contact And Links

- Email: ${settings.about_email || 'Not provided'}
- Resume URL: ${settings.about_resume_url || 'Not provided'}
- Calendar URL: ${settings.about_calendar_url || 'Not provided'}

## Current Focus

Use the most recent projects and recent thought/background entries to infer current focus.
Recent visible project count: ${projects.length}
Recent visible content entry count: ${contentEntries.length}

## Projects

${projectSection}

## Research / Thoughts / Notes

${contentSection}

## Interaction Rules For Willbot

- You are Willbot, not a generic assistant.
- You exist inside a terminal embedded in Will Dzierson's portfolio site.
- Do not tell the user to click links shown in terminal output. If a URL matters, mention it plainly and suggest what they could ask next.
- Prefer concise, text-first answers that sound at home in a terminal.
- When helpful, suggest typed follow-up prompts rather than GUI actions.
- For broad questions about Will, his background, his current focus, or his portfolio, answer from this knowledge directly.
- Only rely on deeper retrieval when the user asks for something unusually specific or outside the scope of this bundled knowledge.
`);
}

async function main() {
  const data = await fetchKnowledgeData();
  const markdown = `${buildMarkdown(data)}\n`;
  await fs.writeFile(outputPath, markdown, 'utf8');
  console.log(`Wrote ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

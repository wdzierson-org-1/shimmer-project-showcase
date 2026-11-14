/**
 * Portfolio copy shared by the site and its agent-readable pages (scripts/agent-pages).
 * Edit here, and both the site and what AI agents read stay in step. Imports nothing, so Node can load it directly.
 */
export type Lens = { label: string; heading: string; body: string; detail?: string; link?: { label: string; caseId: string } };
export type Role = { id: string; name: string; role: string; dates: string; description: string };
export type Brand = { id: string; label: string; client: string };

export const site = {
  origin: 'https://dzierson.com',
  name: 'Will Dzierson',
  tagline: 'Product, design & engineering',
  title: 'Will Dzierson — Product, design & engineering',
  description: 'Product and design leader with 25+ years of experience. A hands-on builder working across AI, healthcare, and human-centered systems.',
  image: { path: '/og-image.png', width: 1200, height: 630 },
};

export const person = {
  name: 'Will Dzierson',
  role: 'VP, Product & Design',
  company: 'InsideTracker',
  companyUrl: 'https://www.insidetracker.com/',
  location: 'Saratoga Springs, New York',
  address: { locality: 'Saratoga Springs', region: 'NY', country: 'US' },
  email: 'will@dzierson.com',
  experience: '25+ years',
};

/** Page titles share one pattern across the site and its generated pages. */
export function pageTitle(name?: string) { return name ? `${name} — ${site.name}` : site.title; }

export const hero = {
  headline: ['Collaboration, curiosity,', 'creation.'],
  intro: ['I conceive, design, build, and ship.', '25+ years connecting what’s possible', 'with what people actually need.'],
};

export const practice: { heading: string[]; statement: string; lenses: Lens[] } = {
  heading: ['Close to the idea.', 'Closer to the work.'],
  statement: 'The most useful place to work is often between disciplines. I connect product strategy, research, design, and engineering—then stay with the work through implementation. Today, I lead Product & Design at InsideTracker. I still build.',
  lenses: [
    { label: 'Product leadership', heading: 'Lead through the work.', body: 'At Grand Rounds, my work progressed from lead and principal design roles to Design Director, growing and coaching the Design & Research teams. My current VP role continues that player-coach approach.', detail: 'Team development · Product direction · Cross-functional delivery' },
    { label: 'Design & engineering', heading: 'Make the decisions testable.', body: 'At Included Health, I built conversational prototypes and worked with clinical, product, and engineering partners. A comparative study of conventional, chat, and voice interfaces informed subsequent AI interaction patterns.', link: { label: 'Explore the multimodal work', caseId: 'cc5b34e1-e0a7-4a59-b3b6-c9e814585c34' } },
    { label: 'Founding', heading: 'Own the problem and the product.', body: 'At Noodle, I co-founded the company, helped raise angel funding, led design, and co-led engineering with contract engineers. The company dissolved; the experience remains part of how I evaluate product bets and execution.', link: { label: 'Explore Noodle', caseId: 'e7149d46-fad6-477b-a91c-77e76723df7d' } },
  ],
};

/** Shown to agents and search engines (schema.org knowsAbout). Keep each line to claims the portfolio supports. */
export const specializations = [
  'Product leadership and building design and research teams',
  'Product strategy',
  'UX research and interaction design',
  'Design engineering and TypeScript prototyping',
  'AI products: RAG, conversational, voice, multimodal, and agentic interfaces',
  'Healthcare and digital health',
  'Mobile design',
  'Founding and 0-to-1 products',
];

export const writing = {
  intro: 'I’m interested in how people understand, govern, and work with intelligent systems—and in bringing a builder’s perspective to teaching and research.',
  recognition: 'Published contributor, Mobile Persuasion — Stanford Persuasive Technology Lab.',
};

export const career = {
  heading: ['A builder’s perspective.', 'At every scale.'],
  intro: 'From early mobile products to AI-native ventures. A career moving between making the product and helping teams do their best work.',
  note: 'Alongside these roles: independent product design, engineering, and advisory work since 2019. Experience drawn from Will’s executive résumé.',
};

export const roles: Role[] = [
 { id: 'insidetracker', name: 'InsideTracker', role: 'VP, Product & Design', dates: '2026—', description: 'Leading product strategy and design for a preventative-health platform, translating biomarkers and scientific insight into useful guidance.' },
 { id: 'kring', name: 'KRING', role: 'Head of Product & UX', dates: '2025–26', description: 'Product vision, UX strategy, and design across pre-seed ventures in health, sustainability, and energy.' },
 { id: 'included-health', name: 'Included Health', role: 'Staff Design Technologist, AI', dates: '2024–25', description: 'Built and evaluated voice, real-time video, and multimodal AI prototypes. Coached product and design teams in AI-enabled workflows.' },
 { id: 'noodle', name: 'Noodle AI', role: 'Co-founder', dates: '2023–25', description: 'Raised angel funding, assembled a team, and designed and co-built a personal medical-history product. The company has since dissolved.' },
 { id: 'obvious', name: 'Obvious Ventures', role: 'Designer in Residence', dates: '2018–19', description: 'Advised founders on product strategy, research, design hiring, and team development. Led UX for DarwinAI’s explainability product.' },
 { id: 'grand-rounds', name: 'Grand Rounds', role: 'Lead → Principal → Design Director', dates: '2014–18', description: 'Built and led the Product Design and Research function across physician tools, consumer health experiences, and internal care platforms.' },
 { id: 'gigwalk', name: 'Gigwalk', role: 'Head of Design', dates: '2012–14', description: 'Directed product design, brand, research, and design systems for a distributed mobile-workforce platform.' },
 { id: 'salesforce', name: 'Salesforce', role: 'Senior Experience Designer, Mobile', dates: '2011–12', description: 'Led a mobile application redesign and explored multimodal voice interaction with an advanced-concepts team.' },
 { id: 'google', name: 'Google', role: 'Mobile User Interface Designer', dates: '2007–10', description: 'Designed early touch interfaces across Search, Local, Calendar, and other products. Led ethnographic research in Beijing and Chongqing.' },
 { id: 'yahoo', name: 'Yahoo!', role: 'Interaction Designer, Mobile', dates: '2005–07', description: 'Designed the Mobile Portal and experiences spanning Messenger, Local, oneSearch, and Photos.' },
 { id: 'earlier', name: 'Independent & studio work', role: 'Design, technology & interactive media', dates: 'Earlier', description: 'Interactive work for Smithsonian, Lincoln Center, Dr. Seuss, IBM, Bose, Caterpillar, PepsiCo, John Hancock, Lockheed Martin, SoftBank Japan, and Harvard Medical School.' },
];

/** Logo wall. A client filters the archive; otherwise the logo opens that role on the career page. */
export const brands: Brand[] = [
 { id: 'google', label: 'Google', client: 'Google' }, { id: 'included-health', label: 'Included Health', client: 'Included Health' }, { id: 'softbank', label: 'SoftBank', client: '' },
 { id: 'salesforce', label: 'Salesforce', client: '' }, { id: 'yahoo', label: 'Yahoo!', client: '' }, { id: 'smithsonian', label: 'Smithsonian', client: 'Smithsonian' },
 { id: 'optum', label: 'Optum', client: 'Optum' }, { id: 'ibm', label: 'IBM', client: '' }, { id: 'bose', label: 'Bose', client: '' },
 { id: 'caterpillar', label: 'Caterpillar', client: '' }, { id: 'obvious', label: 'Obvious Ventures', client: '' }, { id: 'lincoln-center', label: 'Lincoln Center', client: '' },
 { id: 'lockheed-martin', label: 'Lockheed Martin', client: '' }, { id: 'dr-seuss', label: 'Dr. Seuss', client: '' }, { id: 'insidetracker', label: 'InsideTracker', client: '' },
];

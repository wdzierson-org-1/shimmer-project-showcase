export interface VillaBook {
  slug: string;
  company: string;
  role: string;
  years: string;
  color: string;
  teaserVideo: string;
  /** Array of strings matched against Supabase `client` field (case-insensitive) */
  clientMatch: string[];
  intro: string;
}

export const VILLAS: VillaBook[] = [
  // ─── Act I: The Foundation ───────────────────────────────────────────────────
  {
    slug: 'foundation',
    company: 'The Foundation',
    role: 'Interactive Designer → UX Lead',
    years: '1999–2014',
    color: '#f59b00',
    teaserVideo: '',
    clientMatch: ['Google', 'Gigwalk', 'Yahoo', 'Smithsonian'],
    intro: `# Act I — The Foundation

A fifteen-year arc from the earliest days of the interactive web through mobile design at scale. The craft was built here — in scrappy agencies, at global tech companies, and on the frontlines of mobile-first product design.

## Early Web & Interactive Design (1999–2005)

William's career began in Boston at the turn of the web era. At ZEFER Corporation (1999–2001) he designed and built front-end experiences for clients including Lincoln Center, Sun Microsystems, and The Children's Place. At Arcstream Solutions (2001–2002) he led interface design for Bose, Genzyme, and Harvard Medical School, and developed a framework for mobile interaction design called LUCID — years before mobile was mainstream.

At Filament Group (2002–2003) he designed and developed XML/Flash-based rich media applications for Frito-Lay and Iron Mountain. At Productorials (2003–2004) he led the design and development of a rich media presentation platform built on synchronized audio, video, and animation.

A formative project: working with WiVID Systems (2004–2005) to build a location-aware wireless museum guide deployed across five Smithsonian museums, including the National Air and Space Museum.

## Yahoo! (2005–2007)

Joined Yahoo!'s mobile design team in Sunnyvale as an Interaction Designer for Mobile Devices. Led interface design on Yahoo! Mobile Portal, Messenger, Local, oneSearch, and Photos — shaping how millions of people experienced the web on early handsets, before the smartphone era changed everything.

## Google (2007–2010)

Joined Google in Mountain View as a Mobile User Interface Designer. Led design on consumer products including Local & Product Search, Social, Calendar, Reader, News, Docs, and Photos. Set overall mobile design direction across multiple product teams, coordinated design guidelines company-wide, and led a three-month ethnographic study in Beijing and Chongqing researching mobile habits — contributing to a US patent for geographic location determination.

The most important lesson from Google: design at scale isn't about pixels. It's about reasoning that survives a room full of engineers asking "why."

## Gigwalk (2012–2014)

First design hire. No design system, no brand, no component library — just a vision and a deadline. Gigwalk was a mobile platform connecting businesses with a distributed workforce for field data collection: think Uber for on-the-ground tasks, before Uber was a verb.

**What was built:** iOS and Android apps for workers in the field, a web dashboard for enterprise clients managing thousands of tasks, an internal ops tool, and the design system that held it together.

**Why it mattered:** This was where *designing under pressure for people with zero tolerance for friction* became a core skill. Gig workers had one shot to complete a task correctly. If the interface failed them, the job failed.`,
  },

  // ─── Act II: Healthcare Design ────────────────────────────────────────────────
  {
    slug: 'institution',
    company: 'Healthcare Design',
    role: 'Staff Designer · Design Lead',
    years: '2014–2023',
    color: '#16a8a0',
    teaserVideo: '',
    clientMatch: ['Grand Rounds', 'Included Health', 'Optum', 'Crescendo', 'Bernard of Hollywood', 'PHC'],
    intro: `# Act II — Healthcare Design

Nine years of designing systems that people use when they're sick, scared, or confused. Grand Rounds became Included Health — and what started as a specialist second-opinion service grew into one of the most comprehensive healthcare navigation platforms in the country.

## Grand Rounds → Included Health (2014–2023)

Joined as a lead designer when the product was a focused second-opinion platform connecting patients with expert physicians for complex diagnoses. Over nine years, the scope expanded dramatically: virtual primary care, behavioral health, care navigation, benefits management, and ultimately an AI-powered care assistant that guided members through the healthcare system.

**The arc:** Lead designer → design lead → Staff Designer leading the AI/ML product design surface. Helped grow the design team from a small group into a multi-disciplinary organization with embedded research, content strategy, and a shared design system.

**What was built:**
- Multimodal AI care assistant — voice, chat, and video-enabled navigation for members
- The core design system and navigation patterns that unified web and native apps
- Expert second opinion flows, specialist matching, and care routing experiences
- Benefits transparency and explanation tools for employers and members
- Virtual primary care and behavioral health product surfaces

**Why it mattered:** Most healthcare products optimize for the institution — for billing, compliance, and workflow efficiency. This work was about the opposite: putting a clear, trustworthy, human experience in front of people at the moments they needed the system most. That's harder than it sounds in a heavily regulated, high-stakes domain.

## Consulting (concurrent)

Also led design for Crescendo Bioscience (genomics diagnostics), Optum (enterprise health data), and PHC (behavioral health) during this period — bringing the same patient-first lens to adjacent healthcare problems.`,
  },

  // ─── Act III: Founding & Fractional ──────────────────────────────────────────
  {
    slug: 'ai-turn',
    company: 'Founding & Fractional',
    role: 'Founder · Design Director · Fractional CDO',
    years: '2019–Present',
    color: '#8b5cf6',
    teaserVideo: '',
    clientMatch: ['GenSynth', 'Noodle', 'Founder', 'Personal Project', 'Fractional'],
    intro: `# Act III — Founding & Fractional

A chapter of building from scratch, working at the frontier of AI, and partnering with companies that needed senior design leadership without a full-time executive hire.

## Obvious Ventures — Designer in Residence (2018–2019)

Before the AI era became mainstream, William spent a year as Designer in Residence at Obvious Ventures, a venture firm in San Francisco. He collaborated with portfolio startups to implement design-forward product strategies, authored thought leadership on AI in design, and helped position the firm as a leader in AI investment.

## AI Design Technologist — Consulting & Advising (2019–Present)

William has consulted for a range of companies at the intersection of AI, health technology, and e-commerce — providing expertise in AI-driven UX strategy, design innovation, and product direction. Clients span healthcare, fintech, and enterprise software.

## Noodle AI — Founder & CEO (2023–Present)

William founded Noodle AI, building a groundbreaking AI-driven personal medical history application. The product enhances answer accuracy using advanced LLMs including GPT-3.5 and GPT-4, agentic RAG, introspection, and proprietary technologies. He secured angel investment, assembled a mission-driven team, and led the company from concept through product development.

**What was built:**
- AI-powered personal medical history and health intelligence application
- RAG-based Q&A system with LLM integration and proprietary accuracy improvements
- Agentic workflows for automated medical record processing and summarization

**The core design challenge:** How do you design for probabilistic systems — communicating confidence, uncertainty, and AI reasoning to people making health decisions? These turned out to be among the most important design questions of the decade.

## Fractional Design Leadership

Concurrently, William worked as a fractional design director and CDO across multiple companies — bringing senior design perspective to teams that needed leadership bandwidth without a full-time executive hire. This included product strategy, design system foundations, team structure, and hands-on product design.

**Why this chapter mattered:** Founding sharpens judgment in a way nothing else does. You own everything — product, design, business, team. Working fractionally across companies simultaneously built a breadth of pattern recognition across industries and problem types that's hard to get any other way.`,
  },

  // ─── Act IV: The Builder Era ──────────────────────────────────────────────────
  {
    slug: 'builder-era',
    company: 'Independent',
    role: 'Founder · Builder',
    years: '2023–Now',
    color: '#22c55e',
    teaserVideo: '',
    clientMatch: ['Stash', 'Confidential', 'Self-started', 'Self Started'],
    intro: `# Act IV — The Builder Era

After years of working inside institutions — even great ones — the question became: *what happens when you control the whole stack?* Design, engineering, product, and vision. No committees. No roadmap reviews. Just build.

## Stash

A personal life-organization app built around the concept of a universal inbox. Photos, voice memos, documents, links, random thoughts — all captured in one place, organized automatically with AI. The premise: our digital lives have outpaced our organizational tools. Stash is the answer.

Built with React Native, Supabase, and a lot of late nights. The product is a design exercise as much as an engineering one — what does "organized" actually mean when AI can infer structure?

## weOS

A concept for a next-generation operating system designed around how people actually work — nonlinear, collaborative, and context-aware. Currently a high-fidelity interactive prototype exploring what the desktop metaphor could look like if it were invented today, with modern constraints and capabilities.

## This site

This portfolio is itself a project. A hand-built, animated, interactive experience — not a Squarespace template. The island you're exploring right now is a Three.js scene: custom geometry, GLSL water shader, procedural textures, Web Audio music. The whole thing is a demonstration of what's possible when design and engineering aren't separate.

## Why now

The tooling for solo founders and small teams has never been better. The gap between idea and execution has never been smaller. The builder era is the natural consequence of everything before it.`,
  },

  // ─── Act V: What's Next ───────────────────────────────────────────────────────
  {
    slug: "what's-next",
    company: "What's Next",
    role: 'Agentic AI · Design Leadership',
    years: '2025–',
    color: '#f5c518',
    teaserVideo: '',
    clientMatch: [],
    intro: `# What's Next

The horizon is agentic AI — systems that don't just respond, but act. Orchestrate. Plan. Operate across tools and contexts with minimal human intervention. The design challenge of the next decade isn't *how do we make AI feel trustworthy in a chat interface*. It's *how do we design for AI that operates autonomously on behalf of humans*?

## The question I'm pursuing

As AI systems become agents — scheduling, coding, researching, communicating on our behalf — the need for design that governs that relationship becomes urgent. How does a person understand what an agent is doing? How do they trust it? Correct it? Override it without breaking it?

These aren't engineering questions. They're design questions. And almost no one is working on them seriously yet.

## TensorZero

Currently exploring the intersection of LLM optimization, agentic workflow design, and the interfaces that make AI systems legible to the humans working alongside them. If you're building in this space and want to talk, reach out.

## The throughline

Every chapter of this career has been about the same thing: making complex, consequential systems feel clear, trustworthy, and human. Healthcare. Machine learning. Distributed workforces. Intelligent agents. The medium changes. The mission doesn't.`,
  },
];

// ─── Easter egg: Project Ariadne ──────────────────────────────────────────────
export interface CaveBook {
  slug: string;
  title: string;
  color: string;
  intro: string;
}

export const CAVE_BOOK: CaveBook = {
  slug: 'ariadne',
  title: 'Project Ariadne',
  color: '#38bdf8',
  intro: `# Project Ariadne

*This place wasn't on the map.*

Project Ariadne is a long-term initiative to preserve human knowledge in the face of civilizational disruption — a digital "thread" designed to survive catastrophe and help future generations reconstruct what was lost.

William conceived and led the project. Vint Cerf — co-inventor of the internet, VP at Google, and one of the founding figures of the modern digital world — provided input and championed the initiative.

## The problem

Digital information is extraordinarily fragile. Formats become unreadable. Hardware fails. Power grids go down. In a world where nearly all human knowledge is stored digitally, a catastrophic disruption doesn't just disrupt — it erases.

## The vision

A knowledge preservation system built for resilience: designed to be readable with minimal technology, structured so future humans could learn to understand it without existing context, and durable enough to survive the scenarios we hope never happen.

## Why it matters

This was the most unusual project in the portfolio — not because of its scale or its users, but because of its *stakes*. Most design work optimizes for engagement or conversion. Ariadne optimized for legibility across centuries.

*Visit [projectariadne.info](https://projectariadne.info) to learn more.*`,
};

export const VILLA_BY_SLUG = Object.fromEntries(VILLAS.map(v => [v.slug, v]));

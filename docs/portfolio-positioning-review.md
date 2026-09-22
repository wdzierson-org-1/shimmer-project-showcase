# Portfolio direction: a senior practitioner who leads and builds

Prepared September 7, 2026. Proposed positioning and implementation plan; no production CMS changes made.

## Recommendation

Lead with **“I lead the work. I build it, too.”** Support it immediately with your 25+ years, current VP Product & Design role, and three specific demonstrations of impact. The defining distinction is the combination of judgment, design, implementation, and organizational influence. A list of AI tools, an entertaining interface, or a chronological gallery cannot establish that combination on its own.

Working audience priority: senior builder/player-coach opportunities first; founder collaboration second; academic teaching and research collaboration third. This is a provisional editorial choice pending your answer, not a conclusion that your ambitions should be narrowed.

The proposed preview is at **http://127.0.0.1:8081/practice.html**. It has no OS or chat gate. It includes six selected projects, inline case-study views, three public essays, practice perspectives, and distinct contact subjects. Its content is a dated public CMS snapshot rather than a live synchronization. It uses actual project images and keeps the existing site and concepts intact.

## What I investigated

The configured client points to Supabase project `uilvozcryifnpldfpwiz`. The public REST connection worked and returned **21 visible projects, 21 visible content entries, and five site settings**. Only published/visible projects and content were requested. The management MCP rejected authentication; I could not inspect live SQL definitions, RLS policies, private records, deployment logs, or embedding coverage. Public access working does not establish that the backend is fully correct.

Local source reviewed included:

- `src/integrations/supabase/client.ts` and generated table types.
- Project editor fields and image/tag relationships.
- Content fetching, embedding generation, and semantic-search services.
- Admin site settings and the biography display.
- The newer checkout's generated Willbot knowledge file, compared against fresh public CMS records.

The current data model is useful: projects carry descriptions, involvement, year, visibility, sort order, a live URL, and image relationships; separate content entries carry biographies, thoughts, and background; settings hold headline, bio, email, résumé, and calendar. Project embedding code concatenates descriptive fields, involvement, and tags; content has its own embedding service. This is a good retrieval foundation. It does not yet provide a structured editorial model for proving leadership, outcomes, or research contributions.

## Diagnosis: strong evidence, weak prioritization

This is an evidence-informed hypothesis, **not a proven cause of low conversion**. I have not inspected traffic sources, visits, contact events, applications, recruiter conversations, or offer data. A site cannot compensate by itself for poorly matched traffic, a weak referral channel, or a role-market mismatch.

The likely presentation problems are:

1. **Your category is unclear.** “Design, Engineering, Craft.” is attractive but does not identify your level, the problem you solve, or why someone should involve you. An OS can demonstrate taste and technical curiosity while leaving the hiring decision unanswered.
2. **Visitors must do the synthesis.** The current project ordering begins with a personal inbox agent and OS work. The care knowledge system with a quantified outcome appears later. The most persuasive proof is not necessarily the newest or most technically elaborate artifact.
3. **Breadth receives more structure than impact.** Tags describe the tools and disciplines. They don't distinguish something you led, something you personally implemented, an experiment, a shipped system, or a business result.
4. **Leadership is underrepresented.** Your background describes growing and coaching Design & Research at Grand Rounds. Your current VP role is not present in the published background reviewed. The site risks underselling both your prior leadership and current scope.
5. **There is friction at the next step.** `about_resume_url` and `about_calendar_url` are blank. A content entry titled “Recent Resume (2025)” exists, but the request did not inspect attachment fields, so I have not concluded that no résumé file exists. The explicit résumé setting is unconfigured. A calendar is optional; an accessible, current résumé and a clear email action matter more.
6. **AI amplifies editorial inconsistency.** The older generated knowledge file describes Noodle as founded in 2024 with you building the platform; the live record says 2023 and co-leading engineering with contract engineers. Fresh public content is the stronger source. The live record also says Noodle still serves some patients, while your latest update says the company dissolved. These statements may describe different legal and service states; reconcile them explicitly rather than asking RAG to decide.

## The evidence to put first

| Story | Why it earns space | Claim supported by CMS | Evidence still needed |
|---|---|---|---|
| Included Health knowledge system | Demonstrates useful AI with an operational consequence | Average handle time reduced by 1.5 minutes per case; design lead, prototyping, design engineering | Measurement period, baseline, sample, rollout scope, attribution, and permission to publish |
| Noodle | Shows founder ownership and technical depth | Angel round; co-founder; led design and co-led implementation of RAG and multimodal capture | Exact founding/closure timeline, your vs. team contribution, lessons from dissolution, approved traction evidence |
| DarwinAI GenSynth | Establishes substantial ML interface work in 2019 | Principal designer; research, interaction design, prototype, explainability workflows | Dated artifacts, evaluation details, and what changed for users |
| Included Health multimodal work | Connects building to research and organizational influence | Comparative Maze study of original UI, chat, and voice; influenced subsequent design patterns | Study size, task definitions, measures, results, and limits. “Voice won” is not enough alone |
| Google mobile search | Gives product-scale context | Lead interaction-design contributions to shipped mobile features | Specific launches, dates, responsibilities, attributable reach; check tool references against historical dates |
| AgenticOS / Aspect / other maintained systems | Proves continuing implementation ability | Working-system descriptions and open-source artifacts | Maintenance cadence, reproducibility, architecture, evaluations, and real users where available |

The 1.5-minute number is **self-reported portfolio evidence**, not independently verified analysis. Do not turn it into invented cost savings, annualized savings, or a percentage without the required denominators. Likewise, founding a funded company is evidence of ownership; dissolution should not be hidden or converted into a success claim.

## Proposed visitor experience

**First screen:** identity, level, value, and a clear route to evidence. Proposed copy:

> Product & design leader. Hands-on technologist.
>
> I lead the work. I build it, too.
>
> 25+ years turning complex technology into products people can use. From mobile search to healthcare and AI, I bring product judgment, design craft, and the ability to implement.

Use the current VP role from your account, but add employer, scope, and dates only when confirmed. Avoid a sprawling list of titles or “available for anything.”

**Selected work:** three editorially chosen cases, each showing problem, contribution, and supported result before asking for a click. Actual product imagery does the visual work. More projects live in a secondary archive.

**Practice and experience:** explain the throughline across employment, consulting, and founding. Distinguish engagement types and overlapping dates. Don't apologize for a nonlinear career, and don't obscure chronology. Group the Grand Rounds lead → principal → director progression to make continuity visible. Pair a current résumé with the narrative.

**Writing and inquiry:** curate work that develops an argument—agent accountability, privacy, interpretability—not every personal background entry. Personal interests can remain on About. Essays should link to primary references and clearly distinguish argument, observation, experiment, and speculation.

**Contact:** one obvious email CTA for product opportunities, with secondary founder and teaching/research links that prefill relevant subjects. Don't require chat, account creation, or a game interaction.

Visual direction: an editorial portfolio with large, restrained typography, warm paper surfaces, a rust accent, real interface images, and clear role/outcome annotations. Interaction should support comparison and close reading. The preview demonstrates this direction; production should add server-rendered, shareable routes rather than depend on client-side hash views.

## Academic ambitions need a second kind of evidence

Your technical practice can anchor a compelling academic-facing story, particularly around human agency, explainability, and accountable AI. It is not, by itself, a faculty dossier. Distinguish the destinations: a professorship, a lecturer appointment, a visiting appointment, and a research affiliation are different roles.

MIT's published policy describes temporary visiting engineer/scientist/scholar appointments and separately describes research affiliates, normally without salary. This establishes different appointment categories, not eligibility or an offer path for you: https://research.mit.edu/research-policies-and-procedures/visiting-and-affiliate-appointments

Stanford d.school lists lecturers alongside professors in its design teaching community: https://dschool.stanford.edu/study/undergraduate-degree/people. This supports considering teaching-oriented roles separately from faculty research appointments; it does not establish an open position or your fit for a particular search.

A useful academic-facing branch would contain:

- A concise research agenda: for example, how interfaces help people understand and control consequential AI systems. This is a proposed throughline, not a claim of an established research program.
- Two or three rigorous project accounts with questions, methods, findings, limitations, and reproducible artifacts.
- A teaching statement, sample syllabus, a workshop with learning objectives, and evidence of learner outcomes as you develop them.
- An academic CV that distinguishes publications, essays, patents, talks, teaching, collaborations, and industry work. Verify patent identifiers and fellowship wording before foregrounding them.
- A specific invitation to discuss a guest lecture, studio collaboration, or research project, rather than simply announcing an ambition to become a professor at MIT or Stanford.

A proposed workshop could be “Designing accountable AI interfaces”: learners build a small RAG workflow, identify failure modes, make uncertainty visible, and evaluate the resulting interaction. Label it a proposed course until delivered. Prioritize demonstrable teaching and research artifacts over institution names or an affiliation-like logo strip.

## CMS changes to propose, not apply yet

Retain Supabase. Add an editorial layer rather than replacing the CMS or creating a second truth store.

1. **Project presentation:** short summary, problem, delivery status, engagement type, role, personally built components, team contributions, start/end dates, intended audiences, featured rank.
2. **Evidence records:** claim, metric/unit, baseline/comparison, measurement period, method, source, caveat, and publication approval. A claim can remain qualitative.
3. **Case-study sections:** decision, alternatives considered, artifact, result, and learning. Images need captions explaining what the visitor should notice, not only alt text or a primary flag.
4. **Professional history:** current role and scope, employment/consulting/founder distinctions, verified progression, résumé link, and last-reviewed date.
5. **Research/teaching content:** research questions, methods, findings, references, artifact/code links, publication type, teaching status, and learner outcomes. Avoid labeling every prototype “research.”
6. **Publication vs retrieval:** separate editorial homepage inclusion from RAG eligibility and public visibility. A personal fact useful to an assistant need not appear in the main portfolio, and an unpublished record must not leak through retrieval.

Production publishing should validate required proof fields, generate or invalidate the page snapshot, and refresh embeddings when approved source content changes. Include canonical IDs and source URLs in retrieved context; preserve role boundaries and current status. The management connection must be restored before assessing live policies or proposing exact migrations.

## A restrained role for RAG

Keep direct access to every claim and case. Offer a contextual “Find relevant work” or “Ask about this case” action after the visitor has evidence. Responses should cite the underlying case and distinguish documented results from inference. For a job-brief matcher, provide two or three grounded matches and explain gaps; never invent qualifications or treat the match as an objective hiring score.

The first prototype intentionally has no AI call. It tests whether the story works before adding another interaction layer. No prompts, emails, calendar bookings, or Telegram messages were sent during this review.

## Validate conversion instead of assuming it

Before launch, define a qualified inquiry for each audience. Compare equivalent traffic cohorts and record homepage → case view → contact click → actual qualified conversation. A mailto click is intent, not a submitted inquiry or an offer. Review inbound messages manually to understand fit. Use source attribution for referrals and applications, without logging message bodies as analytics.

Test the prototype with a few people who actually hire senior design/technical leaders. After a brief view, ask what level they would place you at, what they would hire you to do, which result they remember, and what evidence they still need. Academic readers should separately assess the research question and teaching contribution. Small qualitative tests guide iteration; they do not prove a conversion uplift.

Immediate editorial priorities: confirm the VP role and scope; substantiate the care-system result; reconcile Noodle's timeline and current status; provide a current résumé; publish one rigorous founder reflection and one research-style case account.

## Implementation and verification

New entry: `practice.html`; code and selected public snapshot: `src/concepts/practice/`. Existing production routes and database content are unchanged. Build: `npx vite build --config vite.concepts.config.ts`. TypeScript and targeted lint passed. Browser verification remains unavailable in this session. The prototype is a design proposal, not a completed CMS migration, validated conversion intervention, or independently audited résumé.

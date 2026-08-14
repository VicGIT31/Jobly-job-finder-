# MASTER PRODUCT + ENGINEERING PROMPT

You are a principal product designer, senior full-stack engineer, AI engineer, browser-extension engineer, and product strategist.

Your assignment is to **upgrade my existing job-search platform into the best AI job-search and application platform for Europe and Asia**.

The functional benchmark is Simplify.jobs, but **DO NOT create a pixel-for-pixel clone, copy their branding, proprietary copy, illustrations, assets, logos, or exact visual trade dress**.

Instead:

- understand the product loops that make platforms such as Simplify effective;
- reproduce and improve the underlying functionality;
- create an original premium interface;
- adapt the entire experience specifically to European and Asian job seekers;
- integrate it into my existing application rather than blindly rebuilding everything;
- produce a real working product, not a static mockup.

The final product should feel like:

**“The AI operating system for getting hired in Europe and Asia.”**

A candidate creates their career profile once, and the platform should then help them:

**Discover → Evaluate → Tailor → Apply → Track → Follow up → Interview → Get hired.**

---

# 1. FIRST: AUDIT THE EXISTING PROJECT

Before changing code:

1. Inspect the entire existing repository.
2. Identify:
   - framework;
   - routing;
   - authentication;
   - database;
   - API architecture;
   - existing job models;
   - existing user/profile models;
   - current job search;
   - current application tracker;
   - resume features;
   - AI integrations;
   - existing design system;
   - existing browser extension, if any;
   - analytics;
   - billing;
   - deployed integrations.
3. Keep useful existing functionality.
4. Refactor weak architecture rather than duplicating it.
5. Do not unnecessarily break existing URLs, user accounts, saved jobs, applications, resumes, or database data.
6. Create safe database migrations when schema changes are required.
7. Reuse existing authentication/database/infrastructure where appropriate.
8. Document anything that must be migrated.

Do not replace functioning systems merely because another implementation is easier.

The objective is an **upgrade**, not an unrelated second product.

---

# 2. PRODUCT POSITIONING

The product is for job seekers across:

## Europe

EU/EEA countries plus:

- United Kingdom
- Switzerland
- Norway
- Iceland
- Liechtenstein
- Balkans
- Eastern Europe
- other European markets

## Asia

Support Asian markets including, but not limited to:

- Singapore
- India
- Japan
- South Korea
- Hong Kong
- UAE
- Saudi Arabia
- Qatar
- Malaysia
- Indonesia
- Thailand
- Vietnam
- Philippines
- Taiwan
- mainland China where legally/technically practical
- other Asian markets

The Americas are **not the focus**.

Do not surface US-centric assumptions throughout the UX.

Examples:

Do not assume:

- USD;
- US work authorization;
- ZIP codes;
- US-style education;
- US-style salary conventions;
- US visa categories;
- US phone formats;
- US-only job boards.

The system should understand the market selected by each user.

---

# 3. CORE PRODUCT PROMISE

A user should only need to create their professional identity once.

From that single source of truth, the system powers:

- job recommendations;
- eligibility checks;
- job matching;
- application autofill;
- resumes;
- cover letters;
- application questions;
- salary preferences;
- work authorization;
- visa sponsorship preferences;
- relocation preferences;
- language requirements;
- saved answers;
- application tracking;
- follow-ups;
- interview preparation.

The platform should eliminate repeated administrative work during a job search.

---

# 4. PRIMARY NAVIGATION

Create a desktop-first SaaS interface with excellent responsive behavior.

Main navigation:

1. **For You**
2. **Jobs**
3. **Applications**
4. **AI Copilot**
5. **Documents**
6. **Insights**

Secondary:

- Profile
- Preferences
- Integrations
- Notifications
- Extension
- Settings

Do not overcrowd the navigation.

Use icons plus labels.

---

# 5. ONBOARDING

Onboarding is extremely important.

Make onboarding fast, progressive, friendly, and visually polished.

Target completion time: approximately 5 minutes for the initial usable profile.

## Step 1 — Import identity

Offer:

- Upload CV/resume PDF
- Upload DOCX where supported
- Import LinkedIn information through permitted mechanisms
- Start manually

Parse the resume with AI and prefill the profile.

Never make users manually enter information that was successfully extracted.

Show:

> “We found 4 experiences, 2 education entries and 17 skills.”

Allow quick confirmation/correction.

## Step 2 — Candidate information

Capture:

- first name;
- last name;
- preferred name;
- email;
- phone;
- country;
- city;
- timezone;
- professional links;
- portfolio;
- GitHub;
- LinkedIn URL;
- personal website.

Support international address and phone formats.

## Step 3 — Career information

Capture:

- current position;
- total years of experience;
- target roles;
- target industries;
- seniority;
- skills;
- technologies/tools;
- education;
- certifications;
- languages + proficiency;
- preferred company size.

## Step 4 — Location preferences

Allow multiple locations.

Examples:

- Paris
- London
- Berlin
- Amsterdam
- Zurich
- Madrid
- Dubai
- Singapore
- Tokyo
- Seoul
- Bangalore

Allow preferences for:

- On-site
- Hybrid
- Remote
- Remote within country
- Remote within EU/EEA
- Remote within timezone
- Fully global remote

Include:

**Maximum commute**
- 15 min
- 30 min
- 45 min
- 60 min

## Step 5 — Work authorization

This must be substantially better than generic US-centric job platforms.

Capture independently for every relevant country/region:

- citizen;
- permanent resident;
- existing unrestricted work authorization;
- temporary work authorization;
- student visa;
- graduate/post-study work permission;
- dependent visa;
- requires employer sponsorship;
- eligible for sponsorship;
- unsure.

Allow:

**“Show me jobs requiring sponsorship.”**

and:

**“Hide jobs where I am clearly ineligible.”**

Never infer nationality or protected/sensitive information.

## Step 6 — Compensation

Country-aware salary preferences.

Support:

- EUR
- GBP
- CHF
- SGD
- AED
- INR
- JPY
- KRW
- HKD
- MYR
- THB
- IDR
- PHP
- other supported currencies

Understand:

- annual salary;
- monthly salary;
- hourly rate;
- day rate;
- internship compensation.

Allow:

- minimum expected compensation;
- preferred compensation;
- “salary flexible”.

Do not incorrectly compare gross/net salary.

## Step 7 — Job preferences

Capture:

- full-time;
- part-time;
- internship;
- graduate programme;
- apprenticeship;
- contract;
- freelance.

Also:

- minimum experience;
- maximum experience;
- industry exclusions;
- company exclusions;
- location dealbreakers;
- salary dealbreakers;
- sponsorship requirements;
- language requirements.

Finish onboarding by immediately displaying personalized jobs.

Do not end with an empty dashboard.

---

# 6. HOME / “FOR YOU”

The logged-in home screen should immediately answer:

**“What should I do next to get hired?”**

Top section:

> Good morning, [Name]

Subtext:

> 38 new jobs match your preferences today.

Primary CTA:

**Find my best matches**

Show an AI search input:

> “Describe the job you want…”

Example placeholder:

> Product designer in Paris or Amsterdam, €60k+, English speaking, visa sponsorship preferred

Below it show:

### Recommended for you

Personalized jobs sorted by fit.

### New since your last visit

Recently discovered jobs.

### High-match jobs

90%+ candidate fit.

### Easy Apply

Applications that can be completed quickly.

### Sponsorship-friendly

Where relevant.

### Remote opportunities

Based on the candidate's location.

### Application tasks

Examples:

- Follow up with Revolut
- Interview tomorrow at 14:00
- Application at Spotify has been inactive for 8 days
- Complete application for Mistral AI

Keep this page actionable rather than turning it into a generic analytics dashboard.

---

# 7. JOB SEARCH

The Jobs screen is a core feature.

Use a high-performance two/three-column browsing experience.

Desktop:

**Left:** filters  
**Center:** job results  
**Right:** selected job details

Do not require navigating to a new page every time the user selects a job.

On mobile, adapt this into stacked screens/drawers.

## Search

Support traditional keyword search and semantic AI search.

Examples:

> machine learning engineer

> French-speaking marketing roles in Singapore

> fintech product jobs in London with visa sponsorship

> remote frontend roles that accept candidates living in Portugal

AI should convert natural-language queries into structured filters.

---

# 8. JOB FILTERS

Include:

### Location
- country
- city
- radius
- multiple locations

### Workplace
- remote
- hybrid
- onsite

### Role

### Category

### Seniority
- internship
- graduate
- entry-level
- associate
- mid-level
- senior
- staff
- principal
- manager
- director
- executive

### Employment
- full-time
- part-time
- contract
- freelance
- internship
- apprenticeship
- graduate programme

### Compensation

Use local currency by default.

### Experience required

### Date posted
- last 24 hours
- last 3 days
- last week
- last month

### Visa / work authorization
- sponsorship available
- sponsorship likely
- no sponsorship
- unknown
- no sponsorship needed based on my profile

### Languages

Examples:

- English
- French
- German
- Spanish
- Italian
- Dutch
- Japanese
- Korean
- Mandarin
- Cantonese
- Arabic
- Hindi

Allow language proficiency filters.

### Company
- size
- industry
- startup
- scale-up
- public company
- nonprofit

### Application method
- Easy Apply
- Autofill supported
- External application

### Match score

### Exclude

- staffing agencies
- previously dismissed jobs
- previously applied jobs
- companies I don't want
- jobs missing salary information

Filters should update results quickly and be reflected in the URL.

Saved searches must be supported.

---

# 9. JOB CARD DESIGN

Each result card should be easy to scan in under 3 seconds.

Display:

- company logo;
- job title;
- company;
- location;
- workplace type;
- salary/range when available;
- employment type;
- posted time;
- sponsorship indicator;
- language requirement;
- fit score;
- Easy Apply/autofill indicator.

Example:

**Product Designer**  
Revolut  
London · Hybrid

£65k–£85k

`92% match` `Visa friendly` `Easy Apply`

Posted 4h ago

Actions:

- Save
- Hide
- Apply

Avoid visually noisy tag overload.

---

# 10. JOB DETAIL PANEL

Opening a job displays a rich detail panel.

Header:

- company logo;
- role;
- company;
- location;
- salary;
- workplace;
- employment type;
- date posted;
- last verified timestamp.

Actions:

**Apply**
**Save**
**Hide**
**Already applied**

Then tabs:

1. Overview
2. Match
3. Company
4. Application

## Overview

Use AI to transform messy job descriptions into:

### Summary

Short 4–6 sentence overview.

### Responsibilities

Structured bullets.

### Requirements

Separate:

- Must have
- Nice to have

### Skills

### Benefits

### Languages

### Work authorization

### Salary

Show original job description underneath.

Never hallucinate missing data.

Missing information must say:

**Not specified**

---

# 11. AI JOB MATCH SCORE

Create a transparent match score from 0–100.

Example:

**91% Strong match**

Break down:

- Skills: 94%
- Experience: 90%
- Location: 100%
- Compensation: 86%
- Language: 100%
- Work authorization: 70%

Then:

### Why you match

✓ 6/7 required skills  
✓ Relevant fintech experience  
✓ Meets experience level  
✓ Location preference matches

### Potential gaps

! Role asks for SQL  
! Sponsorship status unclear

Never pretend this score represents the employer's hiring decision.

Label it clearly as a candidate-side compatibility estimate.

Do not use protected characteristics in the score.

---

# 12. “SHOULD I APPLY?” AI

Add a small AI recommendation:

**Strong Apply**

Other states:

- Great Fit
- Strong Apply
- Worth Applying
- Stretch
- Low Match

Explain reasoning in 2–4 bullets.

Include positive and negative evidence.

Avoid fake certainty.

---

# 13. JOB DATA PIPELINE

Build the system with a provider/adapter architecture.

Prefer:

1. official ATS/public career APIs;
2. licensed feeds;
3. employer career pages where permitted;
4. compliant indexing mechanisms.

Support adapters for major ATS ecosystems where possible, such as:

- Greenhouse
- Lever
- Workday
- Ashby
- SmartRecruiters
- Teamtailor
- Workable
- SAP SuccessFactors
- Oracle recruiting products
- other major regional systems

Every imported job must normalize into one canonical `jobs` model.

Store:

- source;
- source job ID;
- source URL;
- company;
- title;
- location;
- country;
- city;
- lat/lng where allowed;
- salary min;
- salary max;
- salary currency;
- salary period;
- workplace;
- employment type;
- experience;
- seniority;
- description;
- responsibilities;
- requirements;
- skills;
- languages;
- sponsorship information;
- application method;
- published date;
- discovered date;
- last verified;
- expiry;
- active status.

Build deduplication.

The same job appearing through multiple feeds must normally become one canonical opportunity.

Detect expired jobs and remove them from recommendations.

---

# 14. EASY APPLY

Create three application modes.

## Mode A — Native Easy Apply

When direct submission is supported legally and technically:

User clicks:

**Easy Apply**

Open a compact review modal.

Show:

- contact details;
- selected resume;
- cover letter;
- application answers;
- required questions.

Let the user review/edit.

Then:

**Submit application**

After successful submission:

- create tracker record automatically;
- save timestamp;
- save resume version;
- save answers;
- record source;
- display success confirmation.

Never claim success without receiving actual confirmation.

## Mode B — Browser Copilot Autofill

For external ATS websites use the browser extension.

## Mode C — External manual application

Open application website.

Still allow:

- save;
- tracking;
- copying profile data;
- AI answers;
- resume tailoring.

---

# 15. BROWSER EXTENSION

Build a production-quality Chrome-compatible extension using **Manifest V3**.

Name it using my product branding.

The extension must connect securely to the user's account.

The extension's purpose:

**Apply to jobs without repeatedly typing the same information.**

## Extension interface

Compact sidebar or floating panel.

Tabs:

1. Apply
2. Match
3. Profile
4. Answers

When the extension detects a job application:

Show:

**Ready to autofill**

Example:

> 26 fields detected  
> 23 can be completed automatically  
> 3 need your review

CTA:

**Autofill application**

---

# 16. FORM FIELD DETECTION

Build a normalized candidate-field system.

Recognize fields such as:

- first name;
- last name;
- full name;
- email;
- phone;
- address;
- city;
- country;
- postcode;
- LinkedIn;
- portfolio;
- GitHub;
- current employer;
- current title;
- education;
- degree;
- graduation date;
- work experience;
- salary expectations;
- notice period;
- languages;
- work authorization;
- sponsorship;
- relocation;
- resume;
- cover letter.

Detection should use:

- labels;
- placeholders;
- names;
- IDs;
- `aria-*`;
- nearby DOM text;
- form structure;
- ATS-specific adapters;
- carefully constrained AI fallback if needed.

Use deterministic field matching wherever possible.

AI should be the fallback, not the only mechanism.

---

# 17. AUTOFILL SAFETY

Never blindly submit external forms.

The user must remain in control of the final application.

Autofill can complete fields.

It should highlight uncertain responses.

Example:

**Needs review**

> “Will you now or in the future require visa sponsorship?”

If confidence is below the threshold, ask the user instead of guessing.

Never infer sensitive information.

For questions concerning protected/sensitive traits, either:

- leave unanswered;
- use a previously explicitly saved user preference;
- ask the user.

Never manufacture legal/work authorization information.

---

# 18. SAVED ANSWERS

Build a reusable answer library.

Examples:

- desired salary;
- notice period;
- relocation;
- remote preference;
- sponsorship;
- “Why are you interested in us?”;
- “Why are you a good fit?”;
- portfolio information.

If the same or semantically equivalent question appears again, suggest the saved answer.

Show:

**Used 7 times**

Allow:

- edit;
- delete;
- pin;
- create variants.

---

# 19. AI APPLICATION ANSWERS

For open-text questions, include:

**Generate with AI**

Use:

- user profile;
- relevant resume;
- job description;
- company information;
- previous approved answers.

Generate concise, natural responses.

The AI must never fabricate:

- employment;
- projects;
- education;
- certifications;
- technologies;
- language ability;
- achievements.

Allow tone controls:

- concise
- professional
- enthusiastic
- technical
- conversational

Default to concise professional writing.

User must be able to edit before inserting.

---

# 20. RESUME / DOCUMENTS

Create a Documents workspace.

Sections:

- Resumes
- Cover Letters
- Templates

Allow multiple resumes.

Example:

- Product CV
- Startup Product CV
- Fintech Product CV
- Consulting CV

Each application should record which document was used.

---

# 21. RESUME ANALYSIS

When opening a job:

Display:

**Resume Match: 82%**

Break down relevant keywords.

### Found

- Product strategy
- Figma
- User research
- B2B SaaS

### Missing / weak

- experimentation
- SQL
- fintech

Then:

**Improve resume for this job**

AI may suggest changes, but:

NEVER invent experience.

If a keyword is unsupported by the candidate's real background, do not add it merely to increase the score.

---

# 22. RESUME TAILORING

CTA:

**Tailor Resume**

Show a before/after diff.

Example:

Original:
> Worked with teams to improve onboarding.

Suggested:
> Partnered with product, engineering and research teams to redesign onboarding and improve activation by 18%.

But quantitative metrics may only be introduced when already supported by the user's source material.

Otherwise do not invent numbers.

Allow:

- Accept
- Reject
- Edit
- Accept all safe suggestions

Save tailored versions independently.

---

# 23. APPLICATION TRACKER

This is a major product surface.

Route:

`/applications`

Create a modern Kanban board.

Default columns:

1. Saved
2. Applied
3. Assessment
4. Interview
5. Final Interview
6. Offer

Rejected/Withdrawn should remain accessible without dominating the main board.

Cards display:

- company logo;
- company;
- role;
- location;
- application date;
- next activity;
- resume used;
- important reminders.

Support drag-and-drop between statuses.

Automatically timestamp status changes.

---

# 24. TRACKER LIST VIEW

Users can switch:

**Board | List**

List view columns:

- Company
- Position
- Location
- Status
- Applied
- Source
- Salary
- Resume
- Next action
- Updated

Support sorting/filtering.

Filters:

- company;
- title;
- status;
- date range;
- location;
- type;
- source;
- favorite.

Allow users to save views.

---

# 25. APPLICATION DETAIL DRAWER

Clicking an application opens a rich side drawer.

Header:

**Spotify — Product Designer**

Status dropdown.

Sections:

### Timeline

Example:

Aug 14 — Applied  
Aug 17 — Recruiter email  
Aug 21 — Screening interview  
Aug 25 — Portfolio interview

### Job

Original job details.

### Documents

Resume and cover letter used.

### Contacts

Recruiter / hiring manager / referral.

Fields:

- name
- role
- email
- LinkedIn
- notes

### Notes

Rich text notes.

### Interviews

- date;
- stage;
- interviewer;
- meeting link;
- preparation notes;
- outcome.

### Tasks

- follow up;
- prepare interview;
- send thank-you;
- complete assessment.

### Emails

If an email integration exists and the user explicitly connects it.

---

# 26. AUTOMATIC TRACKING

When a job is:

- saved;
- applied through native Easy Apply;
- completed through the extension;

automatically sync it to the tracker.

Allow:

**Already applied**

from any job card.

Allow manual applications.

Allow CSV import.

Allow CSV export.

Build duplicate detection.

---

# 27. STATUS DETECTION

Where explicit user-authorized email integration is available, identify recruiting events such as:

- application confirmation;
- assessment invitation;
- interview request;
- rejection;
- offer-related communication.

Then suggest:

> “Spotify appears to have invited you to an interview. Move application to Interview?”

Buttons:

**Update status**
**Ignore**

Do not silently make high-impact status changes unless the user has explicitly enabled automatic updates.

---

# 28. FOLLOW-UP ASSISTANT

For applications without updates:

Show intelligent suggestions.

Example:

> Applied 8 days ago — consider following up.

CTA:

**Draft follow-up**

Generate contextual messages based on:

- role;
- company;
- submission date;
- contact;
- previous conversation.

Also support:

- recruiter introduction;
- referral request;
- interview thank-you;
- post-interview follow-up;
- offer clarification.

---

# 29. INSIGHTS

Create useful job-search analytics.

Do not turn this into vanity metrics.

Display:

### This week

- 23 applications
- 5 recruiter responses
- 3 interviews
- 2 assessments
- 1 offer

### Funnel

Saved → Applied → Response → Interview → Offer

### Response rate

### Interview rate

### Best-performing resume

### Applications by country

### Applications by role

### Applications by source

### Median time to response

### Weekly activity

Use simple, beautiful charts.

Add recommendations:

> Your fintech applications are receiving 2.1× more recruiter responses than your marketplace applications.

Only display conclusions when there is enough data.

---

# 30. AI COPILOT

Create a persistent AI assistant.

Do NOT make it a generic chatbot.

It should understand the user's job-search data.

Example commands:

> Find me 20 London fintech jobs posted in the last three days.

> Which jobs should I apply to first?

> Show me jobs where I have at least an 85% match.

> Which applications should I follow up on today?

> Tailor my Product CV for this job.

> Compare these three offers.

> Prepare me for tomorrow's interview.

> Find English-speaking jobs in Paris where French is optional.

> Show jobs in Singapore that may sponsor foreign candidates.

The AI should execute product actions where safe instead of merely describing how.

Always ask for confirmation before irreversible/external actions such as submitting an application or sending a message.

---

# 31. COMPANY PAGES

Create company profiles.

Display:

- logo;
- description;
- headquarters;
- locations;
- size;
- industry;
- website;
- active jobs;
- salary information where reliable;
- workplace patterns;
- benefits where known;
- sponsorship signals where supported;
- jobs matching this candidate.

CTA:

**Follow company**

Allow alerts when matching roles appear.

---

# 32. REGIONAL INTELLIGENCE — EUROPE

Make European localization a competitive advantage.

Support:

- EU/EEA work authorization;
- UK-specific authorization;
- Switzerland;
- country-specific residence/work permission;
- relocation;
- local languages;
- salary currencies;
- notice periods;
- remote-country restrictions;
- internships;
- apprenticeships;
- graduate schemes/programmes.

Examples of useful filters:

**English-speaking roles in Paris**

**EU sponsorship available**

**Remote anywhere in EU**

**UK visa sponsorship**

**German optional**

**Relocation package**

Avoid presenting uncertain immigration information as legal advice.

Use:

- “sponsorship indicated”
- “sponsorship not specified”
- “may require verification”

---

# 33. REGIONAL INTELLIGENCE — ASIA

Support:

- local work authorization;
- sponsorship;
- local/foreign candidate eligibility;
- language expectations;
- country-specific compensation formats;
- relocation;
- remote restrictions;
- notice periods;
- timezone considerations.

Examples:

**English-first roles in Tokyo**

**Singapore roles open to international candidates**

**Dubai fintech roles**

**Remote APAC product roles**

**Korean optional**

Again, never infer visa eligibility from insufficient information.

---

# 34. MULTILINGUAL UX

Architecture must support localization from day one.

Initial UI can launch in English, but all UI strings must be internationalization-ready.

Prepare translation architecture for:

- English
- French
- German
- Spanish
- Italian
- Dutch
- Portuguese
- Japanese
- Korean
- Mandarin Chinese
- Arabic

Do not hardcode visible strings throughout components.

Support right-to-left layout for Arabic when localized.

---

# 35. DESIGN DIRECTION

The existing product should receive a **significant visual upgrade**.

Target feeling:

- premium;
- calm;
- intelligent;
- fast;
- trustworthy;
- modern;
- slightly playful;
- sophisticated enough for experienced professionals;
- approachable enough for graduates.

Do NOT imitate Simplify's exact visual system.

Create our own identity.

## Visual principles

Think:

**Linear + Notion + Stripe + modern AI product**

but warmer and more human.

Use:

- generous whitespace;
- clean cards;
- subtle borders;
- soft elevation;
- excellent typography;
- restrained gradients;
- purposeful motion;
- high-quality skeleton states;
- polished empty states.

Avoid:

- excessive purple gradients;
- generic AI sparkles everywhere;
- glassmorphism overload;
- huge rounded rectangles everywhere;
- dashboard clutter;
- cartoonish SaaS illustrations;
- unnecessary animations.

---

# 36. DESIGN SYSTEM

Use an 8px spacing system.

Suggested border radius:

- controls: 10px
- cards: 14px
- major surfaces: 16–20px

Typography:

Use a modern sans-serif such as Inter/Geist or the project's existing premium font.

Hierarchy must be obvious.

Example:

- page title: 28–32px;
- section heading: 18–22px;
- body: 14–16px;
- metadata: 12–14px.

Buttons:

- primary;
- secondary;
- ghost;
- destructive.

Inputs should have strong focus states.

Use semantic colors for:

- success;
- warning;
- error;
- info.

Do not rely on color alone for statuses.

Meet WCAG AA accessibility standards where practical.

---

# 37. PRODUCT MICROINTERACTIONS

Add subtle polish.

Examples:

Saving a job:

heart/bookmark transitions smoothly.

Applying:

progress steps show:

**Preparing → Submitting → Confirmed**

Tracker:

dragging a card gives proper elevation and insertion feedback.

Autofill:

fields briefly indicate completion.

AI generation:

show useful progress instead of fake long loading sequences.

Use optimistic UI only when failure can be safely rolled back.

---

# 38. RESPONSIVE EXPERIENCE

Desktop is primary for serious job search and application management.

But mobile must be excellent for:

- job discovery;
- saving;
- reviewing matches;
- tracker updates;
- reminders;
- follow-ups.

Do not squeeze a three-column desktop layout onto a phone.

Use drawers, bottom sheets, and dedicated mobile detail screens.

---

# 39. DATA MODEL

Design clean normalized models.

At minimum include:

`users`

`candidate_profiles`

`candidate_preferences`

`candidate_work_authorizations`

`candidate_languages`

`candidate_skills`

`candidate_experiences`

`candidate_education`

`companies`

`jobs`

`job_locations`

`job_skills`

`job_languages`

`job_sources`

`saved_jobs`

`applications`

`application_status_history`

`application_documents`

`application_answers`

`application_contacts`

`application_interviews`

`application_notes`

`application_tasks`

`resumes`

`resume_versions`

`cover_letters`

`saved_answers`

`saved_searches`

`notifications`

`integrations`

`job_matches`

`job_ingestion_runs`

`job_source_records`

Use strong indexes for job search, country, date, status, user/application ownership and vector search where applicable.

---

# 40. APPLICATION STATUS MODEL

Use canonical internal states.

Example:

`SAVED`

`STARTED`

`APPLIED`

`ASSESSMENT`

`RECRUITER_SCREEN`

`INTERVIEW`

`FINAL_INTERVIEW`

`OFFER`

`ACCEPTED`

`REJECTED`

`WITHDRAWN`

`ARCHIVED`

Allow UI grouping so the tracker remains simple.

Maintain status history rather than overwriting history.

---

# 41. AI ARCHITECTURE

Use AI where it creates real value.

Good AI tasks:

- resume parsing;
- job-description normalization;
- semantic matching;
- skills extraction;
- requirement extraction;
- job summarization;
- application-answer drafting;
- resume suggestions;
- email drafting;
- semantic saved-answer matching;
- natural-language job search;
- interview preparation.

Do NOT use expensive AI calls for tasks deterministic code can perform reliably.

Cache reusable outputs.

Store model/version metadata for generated content when appropriate.

Use structured JSON outputs validated against schemas.

Never trust raw model output.

---

# 42. MATCHING ENGINE

Do not simply calculate embedding similarity.

Use a hybrid score.

Possible architecture:

`overall_score = skills + experience + title_similarity + location + compensation + authorization + language + employment_type + preferences`

Weights must be configurable.

Hard dealbreakers may disqualify a recommendation.

Example:

If candidate requires fully remote and job is onsite-only, do not show a 95% match.

If candidate lacks work authorization and employer explicitly says no sponsorship, clearly flag eligibility.

Explain every score.

---

# 43. SEARCH ARCHITECTURE

Use appropriate full-text and semantic search.

Recommended architecture depending on existing stack:

- PostgreSQL;
- Postgres full-text search;
- pgvector or equivalent vector store;
- optional Typesense/Meilisearch/Elasticsearch if needed at scale.

Search must support:

- typo tolerance;
- synonyms;
- title normalization;
- semantic role similarity;
- geography;
- filters;
- recency;
- relevance.

Examples:

“Software developer” should find relevant “Software Engineer” roles.

“Product lead” should understand related senior product titles.

---

# 44. AUTHENTICATION

Support:

- email/password or magic link;
- Google;
- LinkedIn only if supported through official permitted authentication mechanisms;
- Apple where appropriate.

Do not build unnecessary custom authentication if the existing app already has secure auth.

---

# 45. PRIVACY

Treat privacy as a core product feature.

Especially because the product stores:

- resumes;
- employment history;
- education;
- contact information;
- application history;
- potentially recruiting emails.

Principles:

- data minimization;
- explicit consent;
- purpose limitation;
- secure storage;
- sensible retention;
- user export;
- account deletion;
- revocable integrations.

Add:

**Download my data**

and:

**Delete my account and data**

Make third-party integrations individually revocable.

Do not collect sensitive demographic information unless genuinely required and explicitly provided.

Never infer protected characteristics.

---

# 46. GDPR-ORIENTED PRODUCT REQUIREMENTS

For users where GDPR applies:

Create:

- clear privacy controls;
- transparent consent;
- cookie controls where required;
- deletion workflows;
- data export;
- integration permission management;
- audit-friendly consent records.

Do not use pre-ticked consent checkboxes.

Separate necessary processing from optional marketing/analytics consent where appropriate.

Do not claim legal compliance merely because these controls exist; surface areas requiring legal review in project documentation.

---

# 47. SECURITY

At minimum:

- strong authorization on every user-owned resource;
- server-side permission checks;
- encrypted transport;
- safe secrets management;
- rate limiting;
- validated uploads;
- file type/size validation;
- signed document access URLs;
- secure OAuth token storage;
- CSRF protections where applicable;
- XSS protection;
- SQL injection protection through parameterized ORM/query methods;
- sanitized rich text;
- webhook signature verification;
- audit logs for important integration events.

Never expose AI/API credentials in frontend code or browser extension bundles.

---

# 48. NOTIFICATIONS

Build useful notification controls.

Types:

- new high-match jobs;
- saved search alerts;
- followed company jobs;
- interview reminders;
- assessment deadlines;
- follow-up reminders;
- tracker updates.

Users should control frequency:

- immediate;
- daily digest;
- weekly;
- off.

Avoid notification spam.

---

# 49. EMAIL DIGEST

Optional daily/weekly email:

**12 jobs worth your attention**

Rank by candidate fit.

Each card:

- company;
- title;
- location;
- compensation;
- fit;
- reason;
- Apply / Save.

Also:

**3 applications need attention**

Example:

Spotify — follow up  
Wise — assessment due tomorrow  
Revolut — interview Monday

---

# 50. EMPTY STATES

Never show dead empty screens.

Examples:

Applications empty:

> Your job search, organized automatically.

CTA:

**Find jobs**

Secondary:

**Add application**

Documents empty:

> Upload your current CV and we'll turn it into a reusable candidate profile.

Jobs with no matches:

Explain which filters are too strict and offer one-click relaxation.

---

# 51. ERROR STATES

Handle:

- expired jobs;
- duplicate applications;
- ATS downtime;
- failed autofill;
- missing required answers;
- resume upload failures;
- AI failures;
- job source downtime;
- failed external application submission.

Give useful recovery actions.

Never show raw technical errors to end users.

---

# 52. PERFORMANCE

The product must feel fast.

Targets:

- skeleton state immediately;
- cached job search where appropriate;
- lazy load expensive details;
- virtualize large job/tracker lists when necessary;
- optimize images;
- avoid unnecessary AI calls;
- debounce search;
- paginate/infinite load intelligently.

Do not send entire resumes/job databases to the client unnecessarily.

---

# 53. RECOMMENDED TECH STACK

First prefer the existing project's stack.

If no strong architecture exists, use:

### Web
- Next.js
- TypeScript
- React

### UI
- Tailwind CSS
- accessible component primitives
- Lucide icons

### Backend
- Next.js server/API routes or separate backend where justified

### Database
- PostgreSQL

### ORM
- Prisma or Drizzle

### Authentication
- existing auth or a mature provider

### Search
- PostgreSQL FTS + pgvector initially

### Storage
- S3-compatible secure object storage

### AI
Provider abstraction layer so models can be changed later.

### Extension
- TypeScript
- React where appropriate
- Chrome Manifest V3

### Jobs
Provider adapter architecture.

Do not introduce 15 services for an MVP when PostgreSQL can do the job.

---

# 54. MVP DEFINITION

“MVP” does NOT mean fake buttons or static screens.

The MVP must include a complete functional loop.

## P0 — MUST WORK

### Account
- authentication;
- candidate profile;
- resume upload/parsing;
- preferences.

### Jobs
- actual job database;
- Europe + Asia filtering;
- search;
- job details;
- save/hide;
- match score.

### Applications
- application tracker;
- board/list;
- manual applications;
- automatic records from supported flows;
- statuses;
- notes;
- tasks.

### Documents
- resume storage;
- resume analysis;
- basic AI tailoring.

### Apply
- at least one real native/direct application integration where feasible OR robust external apply;
- browser extension foundation;
- autofill for common forms;
- user review before submission.

### AI
- job summaries;
- match explanations;
- application answers;
- natural-language job search.

### UX
- responsive;
- loading/error/empty states;
- production-quality design.

Everything must be connected to real persistence.

---

# 55. P1 — NEXT

After P0 is stable:

- Gmail/email integration;
- automatic recruiter-email matching;
- recommended tracker status updates;
- follow-up AI;
- interview preparation;
- deeper analytics;
- company following;
- personalized alerts;
- broader ATS adapter coverage;
- more locales;
- referral/network features.

Build P0 architecture so P1 does not require rewrites.

---

# 56. DO NOT BUILD THESE BADLY

Avoid these common AI-generated-product mistakes:

- fake job cards;
- hardcoded dashboards;
- buttons without handlers;
- “AI” labels with no AI;
- random gradients;
- excessive rounded cards;
- giant hero sections inside authenticated software;
- duplicate navigation;
- meaningless charts;
- fake application success states;
- hardcoded US data;
- static match percentages;
- localhost assumptions;
- frontend-only persistence;
- giant monolithic components;
- untyped API responses;
- direct model calls from React components;
- secrets exposed client-side.

A feature is not complete until it works end-to-end.

---

# 57. DEMO / SEED DATA

For development/demo only, create realistic jobs from European and Asian markets.

Example locations:

- London
- Paris
- Berlin
- Amsterdam
- Dublin
- Zurich
- Madrid
- Barcelona
- Stockholm
- Copenhagen
- Helsinki
- Warsaw
- Lisbon
- Vienna
- Prague
- Singapore
- Dubai
- Tokyo
- Seoul
- Hong Kong
- Bangalore
- Mumbai

Use fictional or clearly seed/demo companies unless real data is being imported legitimately.

Do not present demo jobs as live opportunities.

---

# 58. VISUAL HOMEPAGE / LANDING PAGE

Public landing page should clearly explain the loop.

Hero:

**Your AI job search partner for Europe & Asia**

Supporting copy:

> Discover jobs that actually fit, tailor every application, autofill repetitive forms and track your entire search from one profile.

CTA:

**Start job searching**

Secondary:

**See how it works**

Then product demonstration sections:

### Find jobs built around you

Show job-search UI.

### Know your fit before you apply

Show match analysis.

### Stop filling the same application twice

Show extension.

### Tailor every application

Show resume analysis.

### Keep every opportunity organized

Show tracker.

### Built for international careers

Show work authorization, languages, salaries, locations and sponsorship intelligence.

Finish with a strong CTA.

Do not copy competitor marketing text.

---

# 59. BRAND FEEL

The brand should suggest:

- movement;
- opportunity;
- intelligence;
- international careers;
- confidence;
- momentum.

Do not make it feel like an HR/recruiter tool.

This product belongs to the **candidate**.

Copy should be direct and helpful.

Good:

> 14 jobs worth applying to today.

Bad:

> Leverage our revolutionary AI-powered employment ecosystem to optimize your professional journey.

Use normal human language.

---

# 60. KEY DIFFERENTIATORS

Make the product better than a generic Simplify clone through these differentiators:

## 1. Europe + Asia native

Not a US product with country filters added afterward.

## 2. Work-authorization intelligence

Users understand whether a job is realistically compatible with their situation.

## 3. Language intelligence

Separate:

- required;
- preferred;
- optional.

## 4. Salary localization

Correct currencies and compensation periods.

## 5. Transparent matching

Show exactly why someone matches.

## 6. Application priority

Tell candidates which jobs deserve attention first.

## 7. Cleaner tracker

Applications, contacts, documents, interviews and follow-ups connected around one opportunity.

## 8. AI with memory of approved career information

No repetitive prompts.

## 9. Better visual design

More polished, calmer and faster than existing job platforms.

## 10. Candidate control

AI assists; candidate decides.

---

# 61. APPLICATION PRIORITY SCORE

Besides Match Score, create an optional:

**Priority Score**

This answers:

**“Which job should I apply to first?”**

Combine:

- match;
- recency;
- closing deadline;
- application difficulty;
- compensation;
- candidate preferences;
- sponsorship fit;
- competition signal if reliable;
- employer desirability based on user preferences.

Example:

**Apply first — 96 priority**

Reasons:

- posted 3 hours ago;
- 91% candidate match;
- salary exceeds preference;
- sponsorship indicated;
- application takes ~4 minutes.

This is a major UX differentiator.

---

# 62. APPLICATION EFFORT ESTIMATE

Where possible estimate:

**~3 min application**

or:

**~12 min application**

Inputs may include:

- number of fields;
- number of custom questions;
- required cover letter;
- assessment requirement;
- autofill coverage.

Use this together with priority.

Example:

> 92% match · 4 min to apply

This makes job browsing more actionable.

---

# 63. USER SUCCESS METRIC

Optimize the product for:

**qualified interviews per unit of candidate effort**

Not:

- number of page views;
- number of meaningless applications;
- maximum applications per day.

Do not encourage spam applying.

Help users submit **better applications faster**.

---

# 64. ANALYTICS EVENTS

Add structured analytics for important product events:

- onboarding_started;
- onboarding_completed;
- resume_uploaded;
- job_viewed;
- job_saved;
- job_hidden;
- apply_started;
- autofill_started;
- autofill_completed;
- application_submitted;
- application_added;
- application_status_changed;
- resume_tailored;
- ai_answer_generated;
- saved_search_created;
- high_match_job_clicked.

Do not include sensitive resume/application contents in analytics events.

---

# 65. TESTING

Implement tests for critical functionality.

At minimum:

### Unit tests
- normalization;
- match scoring;
- authorization rules;
- salary normalization;
- country/currency mapping;
- job deduplication;
- application status logic.

### Integration tests
- signup → onboarding;
- resume upload;
- search;
- save job;
- apply;
- tracker creation;
- status update.

### Extension tests
Test representative form structures.

### E2E
Critical happy path:

1. create account;
2. upload resume;
3. finish preferences;
4. find matching job;
5. inspect match;
6. tailor resume;
7. start application;
8. complete application;
9. tracker updates automatically.

No release should break this loop.

---

# 66. DEVELOPMENT EXECUTION ORDER

Implement in this order:

### Phase 1
Audit/refactor foundation.

### Phase 2
Database models + candidate profile.

### Phase 3
Resume parsing + onboarding.

### Phase 4
Job ingestion + normalization.

### Phase 5
Job search + detail experience.

### Phase 6
Matching engine.

### Phase 7
Save/hide/application tracker.

### Phase 8
Resume matching/tailoring.

### Phase 9
Browser extension + autofill.

### Phase 10
AI application answers.

### Phase 11
Insights + follow-ups.

### Phase 12
polish, responsive design, accessibility, testing and performance.

Do not spend days perfecting the landing page while the core job-search loop is broken.

---

# 67. DEFINITION OF DONE

The product is done for MVP when a real user can:

1. create an account;
2. upload their existing resume;
3. have it parsed into a profile;
4. specify target roles;
5. choose European/Asian locations;
6. specify salary;
7. specify language preferences;
8. specify work authorization/sponsorship needs;
9. receive relevant jobs;
10. search/filter jobs;
11. understand why a job matches;
12. save/hide jobs;
13. tailor their resume;
14. generate application answers;
15. apply through a supported workflow;
16. use browser autofill on supported external applications;
17. have applications added automatically to their tracker;
18. manually add other applications;
19. move applications through stages;
20. store notes/documents/contacts;
21. see useful application analytics;
22. know what to follow up on next.

Every important action must persist after refresh.

---

# 68. FINAL QUALITY BAR

Before declaring completion, review every screen as:

- a product designer;
- a job seeker;
- a senior frontend engineer;
- a backend engineer;
- a security reviewer.

Ask:

**Is it obvious what to do next?**

**Does every button work?**

**Is the information real or clearly labelled demo data?**

**Does refresh preserve state?**

**Does it work on mobile?**

**Is it fast?**

**Is this truly built for Europe and Asia?**

**Does the product reduce candidate effort?**

**Is AI providing evidence rather than magic percentages?**

**Does the design look intentionally designed rather than generated from a generic SaaS template?**

Fix anything that fails these tests.

---

# 69. IMPORTANT INSTRUCTION TO THE CODING AGENT

Do not merely explain what should be built.

**Build it.**

Do not return only architecture diagrams or suggestions.

Inspect the existing repository, create the necessary migrations/components/API routes/services, integrate them with the current product and implement working end-to-end flows.

When a third-party credential or service is genuinely required and unavailable:

1. build the integration abstraction;
2. implement a development adapter/mock;
3. clearly mark the required environment variable;
4. keep the rest of the feature functional;
5. do not pretend the external call succeeded.

At every stage prefer a smaller number of **fully functional and polished workflows** over dozens of fake UI surfaces.

The finished product should make a European or Asian candidate feel:

> “I enter my career information once. This platform understands what I want, finds the right jobs, tells me which ones are worth my time, helps me submit excellent applications quickly, and keeps the whole job search organized for me.”

That is the product.

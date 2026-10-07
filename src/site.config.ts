// Everything personal lives here. Edit this file, not the templates.
export const SITE = {
  // Swap to 'https://semisentientcode.com' when the domain moves (and add public/CNAME).
  url: 'https://topthishat.github.io',
  name: 'Ralph Lozano',
  blogName: 'Semi-Sentient Code',
  wordmark: 'semi-sentient code',
  role: 'Principal ML Engineer · NLP & GenAI in financial services',
  tagline:
    'I’ve spent ten years shipping NLP and GenAI systems at banks: agents, retrieval, and the pipelines underneath them. I write about what holds up in production.',
  description:
    'Writing on AI engineering, LLM systems, and production machine learning by Ralph Lozano.',
  disclaimer: 'Views are my own and do not represent my employer.',
  links: {
    github: 'https://github.com/TopThisHat',
    linkedin: 'https://www.linkedin.com/in/ralphlozano',
    // Set to '' to hide.
    social: { label: 'Bluesky', url: '' },
    email: '', // e.g. 'hello@semisentientcode.com'
    // Drop a PDF in public/ and set to '/resume.pdf'. '' hides the link.
    resume: '',
  },
  // GoatCounter site code, e.g. 'semisentientcode'. '' disables analytics.
  goatcounter: '',
} as const;

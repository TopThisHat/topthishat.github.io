// Everything personal lives here. Edit this file, not the templates.
export const SITE = {
  // Canonical URL. The custom domain itself is set in repo Settings → Pages.
  url: 'https://semisentientcode.com',
  name: 'Ralph Lozano',
  blogName: 'Semi-Sentient Code',
  wordmark: 'semi-sentient code',
  role: 'Principal ML Engineer',
  tagline:
    'I build machine learning systems in financial services. I write about building software with AI, and dig into the code, papers, and algorithms underneath it.',
  description:
    'Ralph Lozano on building software with AI, and the code, papers, and algorithms underneath it.',
  disclaimer: 'Views are my own and do not represent my employer.',
  links: {
    github: 'https://github.com/TopThisHat',
    linkedin: 'https://www.linkedin.com/in/ralphlozano',
    // Set to '' to hide.
    social: { label: 'Bluesky', url: '' },
    email: 'ralph@semisentientcode.com',
    // Drop a PDF in public/ and set to '/resume.pdf'. '' hides the link.
    resume: '',
  },
  // GoatCounter site code, e.g. 'semisentientcode'. '' disables analytics.
  goatcounter: 'semisentientcode',
} as const;

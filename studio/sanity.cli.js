import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '53e1js8u',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  studioHost: 'twentyfour-law',
})

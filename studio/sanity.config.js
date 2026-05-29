import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'twentyfour-law',
  title: '24 Law Chambers',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || '53e1js8u',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})

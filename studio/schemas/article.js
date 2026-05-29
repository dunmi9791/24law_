import {defineField, defineType} from 'sanity'

const CATEGORIES = [
  {title: 'Public Revenue', value: 'public-revenue'},
  {title: 'Energy & Power', value: 'energy'},
  {title: 'Oil & Gas', value: 'oil-gas'},
  {title: 'Arbitration', value: 'arbitration'},
  {title: 'Infrastructure', value: 'infrastructure'},
  {title: 'Regulatory', value: 'regulatory'},
  {title: 'Nigeria–UK', value: 'cross-border'},
  {title: 'Insolvency', value: 'insolvency'},
]

export default defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {list: CATEGORIES, layout: 'dropdown'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'author'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'readTime',
      title: 'Read Time (minutes)',
      type: 'number',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Short summary shown on article cards.',
      validation: (rule) => rule.required().max(300),
    }),
    defineField({
      name: 'breadcrumbLabel',
      title: 'Breadcrumb Label',
      type: 'string',
      description: 'Short label for the breadcrumb trail (e.g. "Public Revenue Recovery").',
    }),
    defineField({
      name: 'titleEmphasis',
      title: 'Emphasised Words in Title',
      type: 'string',
      description: 'Words from the title to render in italic (e.g. "Without Creating"). Leave blank for no emphasis.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    }),
  ],
  orderings: [
    {title: 'Published (newest)', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', subtitle: 'category', media: 'heroImage'},
  },
})

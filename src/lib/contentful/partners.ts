import { getClient } from './index'

export interface PartnerData {
  id: string
  name: string
  job: string
  picture?: {
    url?: string
    title?: string
    description?: string
  }
  createdAt: string
  updatedAt: string
}

export async function getPartners(preview = false): Promise<PartnerData[]> {
  if (!process.env.CONTENTFUL_SPACE_ID || !process.env.CONTENTFUL_ACCESS_TOKEN) {
    return []
  }
  try {
    const client = getClient(preview)

    const response = await client.getEntries({
      content_type: 'partner',
      order: ['fields.name'],
      limit: 100,
    })

    return response.items.map((item: any) => ({
      id: item.sys.id,
      name: item.fields.name,
      job: item.fields.job,
      picture: item.fields.picture
        ? {
            url: item.fields.picture.fields?.file?.url,
            title: item.fields.picture.fields?.title,
            description: item.fields.picture.fields?.description,
          }
        : undefined,
      createdAt: item.sys.createdAt,
      updatedAt: item.sys.updatedAt,
    }))
  } catch (error) {
    console.error('Error fetching partners:', error)
    throw new Error('Failed to fetch partners')
  }
}

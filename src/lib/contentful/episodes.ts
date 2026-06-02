import { getClient } from './index'

export interface EpisodeData {
  id: string
  title: string
  description?: string
  number: number
  duration: number
  releaseDate: string
  thumbnail?: {
    url?: string
    title?: string
    description?: string
  }
  youtubeLink?: string
  xLink?: string
  createdAt: string
  updatedAt: string
}

export async function getEpisodes(preview = false): Promise<EpisodeData[]> {
  if (!process.env.CONTENTFUL_SPACE_ID || !process.env.CONTENTFUL_ACCESS_TOKEN) {
    return []
  }
  try {
    const client = getClient(preview)

    const response = await client.getEntries({
      content_type: 'episode',
      order: ['fields.number'],
      limit: 100,
    })

    return response.items.map((item: any) => ({
      id: item.sys.id,
      title: item.fields.title ?? '',
      description: item.fields.description ?? undefined,
      number: item.fields.number ?? 0,
      duration: item.fields.duration ?? 0,
      releaseDate: item.fields.releaseDate ?? '',
      thumbnail: item.fields.thumbnail
        ? {
            url: item.fields.thumbnail.fields?.file?.url,
            title: item.fields.thumbnail.fields?.title,
            description: item.fields.thumbnail.fields?.description,
          }
        : undefined,
      youtubeLink: item.fields.youtubeLink ?? undefined,
      xLink: item.fields.xLink ?? undefined,
      createdAt: item.sys.createdAt,
      updatedAt: item.sys.updatedAt,
    }))
  } catch (error) {
    console.error('Error fetching episodes:', error)
    throw new Error('Failed to fetch episodes')
  }
}

export async function getEpisodeById(
  id: string,
  preview = false,
): Promise<EpisodeData | null> {
  try {
    const client = getClient(preview)

    const response = await client.getEntry(id)

    if (!response) {
      return null
    }

    return {
      id: response.sys.id,
      title: (response as any).fields.title ?? '',
      description: (response as any).fields.description ?? undefined,
      number: (response as any).fields.number ?? 0,
      duration: (response as any).fields.duration ?? 0,
      releaseDate: (response as any).fields.releaseDate ?? '',
      thumbnail: (response as any).fields.thumbnail
        ? {
            url: (response as any).fields.thumbnail.fields?.file?.url,
            title: (response as any).fields.thumbnail.fields?.title,
            description: (response as any).fields.thumbnail.fields?.description,
          }
        : undefined,
      youtubeLink: (response as any).fields.youtubeLink ?? undefined,
      xLink: (response as any).fields.xLink ?? undefined,
      createdAt: response.sys.createdAt,
      updatedAt: response.sys.updatedAt,
    }
  } catch (error) {
    console.error('Error fetching episode:', error)

    return null
  }
}

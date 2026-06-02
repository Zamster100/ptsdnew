import { createClient } from 'contentful'
import { config } from '@/config'

let client: ReturnType<typeof createClient> | null = null
let previewClient: ReturnType<typeof createClient> | null = null

function getPublishedClient() {
  if (!client) {
    client = createClient({
      space: config.contentful.spaceId!,
      accessToken: config.contentful.accessToken!,
      environment: config.contentful.environment || 'master',
    })
  }
  return client
}

function getPreviewClient() {
  if (!previewClient) {
    previewClient = createClient({
      space: config.contentful.spaceId!,
      accessToken: config.contentful.previewAccessToken!,
      environment: config.contentful.environment || 'master',
      host: 'preview.contentful.com',
    })
  }
  return previewClient
}

export function getClient(preview = false) {
  return preview ? getPreviewClient() : getPublishedClient()
}

export default getPublishedClient

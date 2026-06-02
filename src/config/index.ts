export const config = {
  contentful: {
    spaceId: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
    previewAccessToken: process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN,
    environment: process.env.CONTENTFUL_ENVIRONMENT,
    x_url: process.env.NEXT_PUBLIC_X_URL,
    youtube_url: process.env.NEXT_PUBLIC_YOUTUBE_URL,
    discord_url: process.env.NEXT_PUBLIC_DISCORD_URL,
    telegram_url: process.env.NEXT_PUBLIC_TELEGRAM_URL,
    instagram_url: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    tiktok_url: process.env.NEXT_PUBLIC_TIKTOK_URL,
    snapchat_url: process.env.NEXT_PUBLIC_SNAPCHAT_URL,
  },
}

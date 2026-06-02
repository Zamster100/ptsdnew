import {
  XIcon,
  YouTubeIcon,
  DiscordIcon,
  TelegramIcon,
  TiktokIcon,
  InstagramIcon,
} from '@/components/icons'
import { SnapchatIcon } from '@/components/icons/SnapchatIcon'
import { config } from '@/config'

export const SOCIALS = [
  {
    name: 'X',
    href: config.contentful.x_url,
    icon: XIcon,
  },
  {
    name: 'Youtube',
    href: config.contentful.youtube_url,
    icon: YouTubeIcon,
  },
  {
    name: 'Discord',
    href: config.contentful.discord_url,
    icon: DiscordIcon,
  },
  {
    name: 'Telegram',
    href: config.contentful.telegram_url,
    icon: TelegramIcon,
  },
  {
    name: 'Instagram',
    href: config.contentful.instagram_url,
    icon: InstagramIcon,
  },
  {
    name: 'TikTok',
    href: config.contentful.tiktok_url,
    icon: TiktokIcon,
  },
  {
    name: 'Snapchat',
    href: config.contentful.snapchat_url,
    icon: SnapchatIcon,
  },
]

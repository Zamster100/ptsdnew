const TYPE_TO_PHOTO_PREFIX: Record<string, string> = {
  'THE HAUNTED': 'Haunted',
  'THE BAG HOLDER': 'Bagholder',
  'THE PERMA BEAR': 'Perma Bear',
  'THE PARANOID DEGEN': 'Paranoid',
  'THE NUMB': 'Numb',
}

const VARIANTS_PER_TYPE = 4

/** Picks one of the 4 art variants for the diagnosed type. Call once per diagnosis and persist the result — do not call on every render. */
export function getRandomPatientPhoto(type: string): string {
  const prefix = TYPE_TO_PHOTO_PREFIX[type]
  if (!prefix) return ''

  const n = Math.floor(Math.random() * VARIANTS_PER_TYPE) + 1

  return encodeURI(`/images/PT/PT ${prefix} ${n}.png`)
}

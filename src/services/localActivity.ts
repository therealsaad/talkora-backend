export function canCompleteLocalActivity(type: string, answer: string, itemCount: number, reflectionSkills: string[] = []): boolean {
  if (type === 'LIKE_DISLIKE') {
    const lines = answer.split('\n').map((line) => line.trim()).filter(Boolean)
    // Level 1 uses a fast warm-up: three genuine preference turns are enough
    // to demonstrate the objective even if legacy curriculum rows still store
    // six visual prompts. Newer seeds may also contain only three prompts.
    const required = Math.min(Math.max(itemCount, 1), 3)
    return lines.length >= required && lines.every((line) => /^(Yes, I do\. I like|No, I don't\. I don't like) .+\.$/i.test(line))
  }
  if (type === 'LISTEN_MODEL') return itemCount > 0 && (answer === `Read all ${itemCount} turns` || answer === `Listened to all ${itemCount} turns`)
  if (type === 'PICTURE_CHOICE') {
    if (!reflectionSkills.length) return answer === 'Viewed lesson reward'
    try {
      const reflection = JSON.parse(answer) as { kind?: unknown; ratings?: unknown }
      if (reflection.kind !== 'Favourite Finder reflection' || !Array.isArray(reflection.ratings) || reflection.ratings.length !== reflectionSkills.length) return false
      const ratings = reflection.ratings as Array<{ skill?: unknown; rating?: unknown }>
      return reflectionSkills.every((skill, index) => {
        const rating = ratings[index]
        return rating?.skill === skill && ['confident', 'practising', 'need_help'].includes(String(rating.rating))
      })
    } catch {
      return false
    }
  }
  return false
}

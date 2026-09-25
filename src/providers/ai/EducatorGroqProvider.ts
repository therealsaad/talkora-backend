import { env } from '../../config/env'
import { educatorAIResponseSchema, EducatorAIResponse } from '../../schemas/educator-ai.schema'
import { ApiError } from '../../utils/ApiError'
import { logger } from '../../utils/logger'

const URL = 'https://api.groq.com/openai/v1/chat/completions'
export const EDUCATOR_SYSTEM_PROMPT = `You are Talkora AI, an educator assistant for school teachers and administrators. Interpret only the supplied Talkora analytics. Never invent performance, scores, attendance, progress, events, or comparisons. If data is missing, say so. Keep insights concise and practical. Do not diagnose medical, psychological, or developmental conditions. Never expose IDs, credentials, PINs, passwords, or secrets. Clearly distinguish recorded facts from teaching suggestions. Return only JSON matching the requested schema.`

export async function askEducatorGroq(message: string, context: unknown): Promise<EducatorAIResponse> {
  if (!env.groqApiKey) throw ApiError.provider('Talkora AI is temporarily unavailable')
  let response: Response
  try {
    response = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.groqApiKey}` }, body: JSON.stringify({
      model: env.groqModel, temperature: 0.25, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: EDUCATOR_SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify({ request: message, authorizedAnalytics: context, responseSchema: { summary: 'string', insights: [{ title: 'string', detail: 'string', type: 'PROGRESS | ATTENTION | ENGAGEMENT | SKILL' }], actions: [{ label: 'string', reason: 'string' }], followUpSuggestions: ['string'] } }) }],
    }) })
  } catch (error) { logger.error('Educator Groq request failed', { error }); throw ApiError.provider('Talkora AI is temporarily unavailable') }
  if (!response.ok) { logger.error('Educator Groq error', { status: response.status }); throw ApiError.provider('Talkora AI is temporarily unavailable') }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const raw = payload.choices?.[0]?.message?.content
  if (!raw) throw ApiError.provider('Talkora AI is temporarily unavailable')
  try { return educatorAIResponseSchema.parse(JSON.parse(raw)) } catch (error) { logger.error('Invalid educator AI response', { error }); throw ApiError.provider('Talkora AI is temporarily unavailable') }
}

import { VoiceSession } from '../models/VoiceSession'
import { GroqSpeechProvider } from '../providers/speech/GroqSpeechProvider'
import { getVoiceProvider } from '../providers/voice'
import { getPronunciationProvider } from '../providers/pronunciation'
import { ApiError } from '../utils/ApiError'
import { Activity } from '../models/Activity'
import { ProgressService } from './progress.service'
import { ActivityAttempt } from '../models/ActivityAttempt'
import { MissJulieService } from './missJulie.service'
import { CurriculumAccessService } from './curriculum-access.service'
import { logger } from '../utils/logger'
import type { VoiceStreamResult } from '../providers/voice/VoiceProvider'
import { GroqVoiceProvider } from '../providers/voice/GroqVoiceProvider'



export type VoicePurpose = 'PAGE_GUIDANCE' | 'LESSON' | 'CONVERSATION' | 'FEEDBACK'

async function tryStream(
  provider: { name: string; synthesizeStream?: (text: string) => Promise<VoiceStreamResult> },
  text: string,
): Promise<VoiceStreamResult | null> {
  if (!provider.synthesizeStream) return null
  try {
    return await provider.synthesizeStream(text)
  } catch (error) {
    logger.warn('Voice provider failed; trying fallback', { provider: provider.name, error })
    return null
  }
}

function evaluateOpenResponse(transcript: string) {
  const words = transcript.toLowerCase().match(/[a-z']+/g) || []
  const completeThought = words.length >= 3
  return {
    score: completeThought ? 85 : 55,
    feedback: completeThought
      ? 'I heard a complete response. Miss Julie will continue the conversation.'
      : 'I heard you. Try adding a few more words to make a complete answer.',
    correctWords: words,
    wrongWords: [],
    missingWords: [],
    extraWords: [],
    wordOrderMatched: true,
    sentenceSimilarity: completeThought ? 85 : 55,
    isAcousticPronunciationScore: false as const,
  }
}

export const VoiceService = {
  async startSession(studentId: string, input: { lessonId?: string; activityId?: string; expectedPhrase?: string }) {
    if (input.activityId) {
      await CurriculumAccessService.assertActivity(studentId, input.activityId)
      const activity = await Activity.findById(input.activityId).select('_id status target lessonId')
      if (!activity || activity.status !== 'active') throw ApiError.notFound('Activity not found')
    }
    return VoiceSession.create({
      studentId,
      lessonId: input.lessonId,
      activityId: input.activityId,
      startedAt: new Date(),
      provider: new GroqSpeechProvider().name,
      status: 'active',
      metadata: input.expectedPhrase ? { expectedPhrase: input.expectedPhrase } : undefined,
    })
  },

  async submitTranscript(studentId: string, sessionId: string, input: { transcript: string; expected?: string }) {
    const session = await VoiceSession.findOne({ _id: sessionId, studentId })
    if (!session) throw ApiError.notFound('Voice session not found')
    if (session.status === 'completed') {
      if (!session.aiResponse && session.activityId) {
        const completedActivity = await Activity.findById(session.activityId).select('aiEnabled')
        if (completedActivity?.aiEnabled) throw ApiError.conflict('This voice session has no teacher reply. Please try a new response.')
      }
      return session
    }
    if (session.status !== 'active') throw ApiError.conflict('Voice session is no longer active')

    const activity = session.activityId ? await Activity.findById(session.activityId).select('target prompt type aiEnabled metadata lessonId') : null
    const sessionExpected = typeof session.metadata?.expectedPhrase === 'string' ? session.metadata.expectedPhrase : undefined
    const conversationMode = activity?.metadata?.conversationMode === 'OPEN' || activity?.type === 'CONVERSATION'
    const expected = sessionExpected || (typeof activity?.metadata?.expectedPhrase === 'string' ? activity.metadata.expectedPhrase : activity?.target)
    if (!conversationMode && !expected) throw ApiError.badRequest('This voice activity has no pronunciation target')
    let evaluation
    if (conversationMode) {
      evaluation = evaluateOpenResponse(input.transcript)
    } else {
      const pronunciationProvider = getPronunciationProvider()
      const result = await pronunciationProvider.evaluate({ word: expected as string, transcript: input.transcript })
      evaluation = {
        score: result.score ?? 0,
        feedback: result.feedback,
        correctWords: result.correctWords,
        wrongWords: result.wrongWords,
        missingWords: result.missingWords,
        extraWords: result.extraWords,
        wordOrderMatched: result.wordOrderMatched,
        sentenceSimilarity: result.sentenceSimilarity,
        isAcousticPronunciationScore: false as const,
      }
    }

    session.transcript = input.transcript
    session.evaluation = evaluation
    session.endedAt = new Date()
    session.duration = session.endedAt.getTime() - session.startedAt.getTime()

    // Speaking progress is recorded only after the server-side pronunciation evaluation;
    // the browser never gets to choose a score or award itself XP.
    let progressResult: Awaited<ReturnType<typeof ProgressService.submitAttempt>> | undefined
    const priorSuccessfulAttempt = session.activityId
      ? await ActivityAttempt.exists({ studentId, activityId: session.activityId, correct: true })
      : null
    if (session.activityId && evaluation && !priorSuccessfulAttempt && !(conversationMode && activity?.aiEnabled)) {
      progressResult = await ProgressService.submitAttempt({
        studentId,
        activityId: session.activityId.toString(),
        answer: input.transcript,
        startedAt: session.startedAt,
        hintsUsed: 0,
        idempotencyKey: `voice:${session._id.toString()}`,
        evaluation: { score: evaluation.score, feedback: evaluation.feedback },
      })
    }

    const aiResponse = activity?.aiEnabled
      ? await MissJulieService.converse(studentId, {
          message: input.transcript,
          lessonId: (session.lessonId || activity.lessonId)?.toString(),
          activityId: activity._id.toString(),
          context: conversationMode ? 'speaking' : 'pronunciation',
          inputMode: 'MIC',
          currentTarget: expected || activity.prompt || undefined,
        })
      : undefined

    session.aiResponse = aiResponse
    session.xpAwarded = progressResult?.xpAwarded ?? 0
    session.conversationMode = conversationMode ? 'OPEN' : 'CONTROLLED'
    session.status = 'completed'
    await session.save()

    return session
  },

  async cancelSession(studentId: string, sessionId: string) {
    const session = await VoiceSession.findOne({ _id: sessionId, studentId })
    if (!session) throw ApiError.notFound('Voice session not found')
    if (session.status === 'active') {
      session.status = 'cancelled'
      session.endedAt = new Date()
      session.duration = session.endedAt.getTime() - session.startedAt.getTime()
      await session.save()
    }
    return session
  },

  async synthesize(text: string, options: { purpose?: VoicePurpose } = {}) {
    const provider = getVoiceProvider()
    return provider.synthesize(text)
  },

  async streamSynthesize(
    text: string,
    options: { studentId?: string; purpose?: VoicePurpose; language?: string } = {},
  ) {
    const purpose = options.purpose ?? 'LESSON'
    const defaultProvider = getVoiceProvider()

    // Fixed syllabus/page lines use the cached Priya pipeline first. If that
    // service is temporarily unavailable, Groq is a safe production fallback
    // so a lesson never becomes silent.
    if (purpose === 'LESSON' || purpose === 'PAGE_GUIDANCE') {
      const cachedLessonVoice = await tryStream(defaultProvider, text)
      if (cachedLessonVoice) return cachedLessonVoice
      const groqFallback = await tryStream(new GroqVoiceProvider(), text)
      if (groqFallback) return groqFallback
      throw ApiError.provider('Miss Julie voice is unavailable. Check the cached voice service and Groq TTS.')
    }

    // Dynamic conversation and feedback always use Groq for low latency.
    const groq = await tryStream(new GroqVoiceProvider(), text)
    if (groq) return groq
    throw ApiError.provider('Conversation voice is unavailable. Configure Groq TTS.')
  },

  getProvider() {
    return getVoiceProvider()
  },

  async transcribeAudio(input: { audioBase64: string; mimeType?: string; durationMs?: number; mode?: 'fast' | 'accurate' }) {
    const provider = new GroqSpeechProvider()
    return provider.transcribe(input)
  },
}

import { AIStructuredResponse } from '../../types'

export interface MissJulieContext {
  studentName: string
  grade: number
  avatarType?: 'BOY' | 'GIRL'
  levelTitle: string
  lessonTitle: string
  activityTitle?: string
  activityTarget?: string
  recentMistakes: string[]
  memoryFacts: string[]
  learningEvidence?: string[]
  promptContext: string
  studentMessage: string
  unitNumber?: number
  stage?: string
  allowedVocabulary?: string[]
  learningObjectives?: string[]
  conversationHistory?: string[]
  requiredConcepts?: string[]
  achievedConcepts?: string[]
  remainingConcepts?: string[]
  hintLevel?: number
  waitingForRetry?: boolean
  retryTargetSkill?: string
  recentJulieOpeners?: string[]
  digitalType?: string
  julieProfile?: Record<string, string>
}

export interface AIProvider {
  name: string
  generate(context: MissJulieContext): Promise<AIStructuredResponse>
}

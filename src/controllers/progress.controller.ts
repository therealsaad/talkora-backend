import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { ProgressService } from '../services/progress.service'
import { ApiError } from '../utils/ApiError'
import { Activity } from '../models/Activity'
import { canCompleteLocalActivity } from '../services/localActivity'
import { HomePractice } from '../models/HomePractice'

export const ProgressController = {
  getHomePractice: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const submission = await HomePractice.findOne({ studentId: req.auth.id, unitKey: 'UNIT1_FAVOURITES' }).lean()
    ok(res, submission ? { reflection: submission.reflection, submittedAt: submission.submittedAt } : null)
  }),
  saveHomePractice: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const submission = await HomePractice.findOneAndUpdate(
      { studentId: req.auth.id, unitKey: 'UNIT1_FAVOURITES' },
      { $set: { reflection: req.body.reflection, submittedAt: new Date() } },
      { upsert: true, new: true, runValidators: true },
    ).lean()
    ok(res, { reflection: submission!.reflection, submittedAt: submission!.submittedAt })
  }),
  completeLocalActivity: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const activity = await Activity.findById(req.params.activityId).select('type stage content')
    if (!activity) throw ApiError.notFound('Activity not found')
    const itemCount = activity.type === 'LIKE_DISLIKE'
      ? (Array.isArray(activity.content?.visualPrompts) && activity.content.visualPrompts.length ? activity.content.visualPrompts.length : 6)
      : (Array.isArray(activity.content?.dialogueTurns) ? activity.content.dialogueTurns.length : 0)
    if ((activity.type === 'PICTURE_CHOICE' && activity.stage !== 'REWARD') ||
        !canCompleteLocalActivity(activity.type, req.body.answer, itemCount, Array.isArray(activity.content?.skills) ? activity.content.skills.filter((skill): skill is string => typeof skill === 'string') : [])) {
      throw ApiError.badRequest('This activity has not been completed')
    }
    const result = await ProgressService.submitAttempt({
      studentId: req.auth.id,
      activityId: req.params.activityId,
      answer: req.body.answer,
      startedAt: new Date(),
      hintsUsed: 0,
      idempotencyKey: `local:${req.auth.id}:${req.params.activityId}`,
      evaluation: { score: 100, feedback: 'Activity completed.' },
    })
    ok(res, result)
  }),
  submitAttempt: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden('Only students submit attempts')
    const { answer, startedAt, hintsUsed, idempotencyKey } = req.body
    const result = await ProgressService.submitAttempt({
      studentId: req.auth.id, // identity derived from the token, never from the request body
      activityId: req.params.activityId,
      answer,
      startedAt: new Date(startedAt),
      hintsUsed,
      idempotencyKey,
    })
    ok(res, result)
  }),

  getForClass: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const progress = await ProgressService.getForStudent(req.auth.id, req.params.classId)
    ok(res, progress)
  }),
}

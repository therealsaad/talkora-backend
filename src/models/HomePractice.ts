import { Document, Schema, Types, model } from 'mongoose'

export interface IHomePractice extends Document {
  studentId: Types.ObjectId
  unitKey: 'UNIT1_FAVOURITES'
  reflection: string
  submittedAt: Date
}

const homePracticeSchema = new Schema<IHomePractice>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  unitKey: { type: String, enum: ['UNIT1_FAVOURITES'], required: true },
  reflection: { type: String, required: true, trim: true, maxlength: 1000 },
  submittedAt: { type: Date, required: true },
}, { timestamps: true })

homePracticeSchema.index({ studentId: 1, unitKey: 1 }, { unique: true })

export const HomePractice = model<IHomePractice>('HomePractice', homePracticeSchema)

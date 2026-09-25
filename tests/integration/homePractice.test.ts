import request from 'supertest'
import mongoose from 'mongoose'
import { createApp } from '../../src/app'
import { School } from '../../src/models/School'
import { Student } from '../../src/models/Student'
import { signToken } from '../../src/utils/jwt'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'

const app = createApp()

beforeAll(connectTestDatabase)
afterAll(disconnectTestDatabase)
afterEach(clearTestDatabase)

it('saves a Level 1 home reflection to the signed-in student and shows it only to their assigned teacher', async () => {
  const school = await School.create({ name: 'Practice School', code: 'HOME01', passwordHash: 'hash', status: 'active' })
  const teacherId = new mongoose.Types.ObjectId()
  const otherTeacherId = new mongoose.Types.ObjectId()
  const student = await Student.create({ schoolId: school._id, teacherId, fullName: 'Saad', rollNumber: '1', passwordHash: 'hash', grade: 4, avatarType: 'BOY' })
  const studentToken = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })
  const teacherToken = signToken({ sub: teacherId.toString(), role: 'TEACHER', schoolId: school._id.toString() })
  const otherTeacherToken = signToken({ sub: otherTeacherId.toString(), role: 'TEACHER', schoolId: school._id.toString() })

  const saved = await request(app).put('/api/progress/home-practice/favourites').set('Authorization', `Bearer ${studentToken}`).send({ reflection: 'I asked a follow-up question and spoke clearly.', studentId: new mongoose.Types.ObjectId().toString() }).expect(200)
  expect(saved.body.data.reflection).toBe('I asked a follow-up question and spoke clearly.')

  const mine = await request(app).get('/api/progress/home-practice/favourites').set('Authorization', `Bearer ${studentToken}`).expect(200)
  expect(mine.body.data.reflection).toBe(saved.body.data.reflection)

  const teacher = await request(app).get(`/api/students/${student._id}`).set('Authorization', `Bearer ${teacherToken}`).expect(200)
  expect(teacher.body.data.homePractice.reflection).toBe(saved.body.data.reflection)

  await request(app).get(`/api/students/${student._id}`).set('Authorization', `Bearer ${otherTeacherToken}`).expect(404)
})

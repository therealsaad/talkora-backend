import { submitVoiceTranscriptSchema, transcribeVoiceSchema } from '../../src/schemas/voice.schema'
import { PythonSpeechProvider } from '../../src/providers/speech/PythonSpeechProvider'

describe('voice request contracts', () => {
  it('does not accept client-authoritative expected pronunciation text', () => {
    const result = submitVoiceTranscriptSchema.safeParse({
      params: { sessionId: 'session-1' },
      body: { transcript: 'tree', expected: 'tree' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts bounded recording metadata', () => {
    const result = transcribeVoiceSchema.safeParse({
      body: { audioBase64: 'AAAA', mimeType: 'audio/webm;codecs=opus', durationMs: 1200 },
    })
    expect(result.success).toBe(true)
  })

  it('rejects recordings outside the student speaking limit', () => {
    const result = transcribeVoiceSchema.safeParse({
      body: { audioBase64: 'AAAA', mimeType: 'audio/webm', durationMs: 12000 },
    })
    expect(result.success).toBe(false)
  })

  it('forwards a MIME-matched filename to faster-whisper', async () => {
    const originalFetch = global.fetch
    let sentFile: File | null = null
    global.fetch = jest.fn(async (_url, options) => {
      sentFile = (options?.body as FormData).get('audio') as File
      return new Response(JSON.stringify({ transcript: 'Hello Miss Julie' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    try {
      await new PythonSpeechProvider().transcribe({
        audioBase64: Buffer.from('wav-bytes').toString('base64'),
        mimeType: 'audio/wav',
      })
      expect((sentFile as File | null)?.name).toBe('student-speech.wav')
      expect((sentFile as File | null)?.type).toBe('audio/wav')
    } finally {
      global.fetch = originalFetch
    }
  })
})

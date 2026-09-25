export interface SpeechRecognitionProvider {
  name: string
  /** Transcribes audio (base64) to text. Returns null transcript + available:false if the provider isn't configured. */
  transcribe(input: { audioBase64: string; mimeType?: string; durationMs?: number }): Promise<{
    transcript: string | null
    available: boolean
    confidence?: number
    latencyMs?: number
    provider?: string
    model?: string
  }>
}

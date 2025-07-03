import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { OpenAIStream, StreamingTextResponse } from 'ai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const { messages } = await req.json()
  // messages: Array&lt;{ role: 'user' | 'assistant', content: string }&gt;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    stream: true,
  })
  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}
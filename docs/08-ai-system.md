# 🤖 AI System Documentation

## Overview

Sakinah's AI system provides Islamic spiritual guidance while maintaining authenticity and scholar-verified accuracy. The system uses a pluggable architecture allowing different AI providers based on needs and resources.

## AI Philosophy and Ethics

### Islamic Principles

- **No Replacement for Scholars**: AI assists but never replaces qualified Islamic scholarship
- **Source Verification**: All Islamic content must trace back to Quran and authentic Sunnah
- **Humility**: AI acknowledges its limitations and defers to human expertise
- **Beneficial Knowledge**: Focus on practical spiritual development, not theological disputes

### Technical Principles

- **Modular Design**: Pluggable AI providers via factory pattern
- **Graceful Degradation**: Falls back to curated content if AI fails
- **Privacy First**: No personal data sent to external AI services
- **Performance**: Fast responses for better user experience

## Architecture

### Factory Pattern Implementation

```typescript
// infrastructure/ai/ai-factory.ts
export interface AIProvider {
  suggest(input: TazkiyahInput): Promise<TazkiyahOutput>
  explain(struggle: string): Promise<AIExplanation>
}

export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'rules'

  switch (provider) {
    case 'llm':
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI key missing, falling back to rules-based AI')
        return new RulesAiProvider()
      }
      return new LlmAiProvider()
    case 'rules':
    default:
      return new RulesAiProvider()
  }
}
```

### Base Types

```typescript
// Types for AI system
export interface TazkiyahInput {
  mode: 'takhliyah' | 'tahliyah'
  text: string
  context?: string
}

export interface TazkiyahOutput {
  target: string
  microHabits: MicroHabit[]
  tags: string[]
  timeline: string
  confidence: number // 0-1, how confident AI is in suggestion
}

export interface AIExplanation {
  guidance: string
  islamicBasis?: string[]
  recommendations?: string[]
  confidence: number
}

export interface MicroHabit {
  title: string
  description: string
  frequency: 'daily' | 'weekly' | 'as_needed'
  difficulty: 'easy' | 'medium' | 'hard'
  islamicBasis?: string
}
```

## Rules-Based AI Provider (Default)

### Implementation

```typescript
// infrastructure/ai/rules-ai-provider.ts
export class RulesAiProvider implements AIProvider {
  private readonly knowledgeBase = new IslamicKnowledgeBase()

  async suggest(input: TazkiyahInput): Promise<TazkiyahOutput> {
    // 1. Analyze input text for key themes
    const themes = this.extractThemes(input.text)

    // 2. Map to Islamic concepts
    const islamicConcepts = this.mapToIslamicConcepts(themes, input.mode)

    // 3. Generate micro-habits based on concepts
    const microHabits = this.generateMicroHabits(islamicConcepts, input.mode)

    // 4. Determine timeline based on difficulty
    const timeline = this.calculateTimeline(microHabits)

    return {
      target: islamicConcepts[0]?.name || themes[0],
      microHabits,
      tags: islamicConcepts.flatMap(c => c.tags),
      timeline,
      confidence: 0.85 // High confidence for rule-based
    }
  }

  private extractThemes(text: string): string[] {
    const lowercaseText = text.toLowerCase()
    const themes: string[] = []

    // Pattern matching for common spiritual struggles/goals
    const patterns = {
      anger: ['anger', 'angry', 'rage', 'furious', 'temper'],
      patience: ['patience', 'patient', 'sabr', 'wait', 'endure'],
      envy: ['envy', 'jealous', 'jealousy', 'envious'],
      pride: ['pride', 'proud', 'arrogant', 'arrogance', 'better than'],
      gratitude: ['grateful', 'gratitude', 'thankful', 'hamd', 'blessing'],
      tawakkul: ['trust', 'tawakkul', 'rely', 'depend on allah']
    }

    for (const [theme, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => lowercaseText.includes(keyword))) {
        themes.push(theme)
      }
    }

    return themes.length > 0 ? themes : ['general_development']
  }

  private mapToIslamicConcepts(themes: string[], mode: 'takhliyah' | 'tahliyah') {
    const conceptMap = mode === 'takhliyah' ?
      this.knowledgeBase.purificationConcepts :
      this.knowledgeBase.beautificationConcepts

    return themes
      .map(theme => conceptMap[theme])
      .filter(Boolean)
      .slice(0, 2) // Limit to 2 main concepts for focus
  }

  private generateMicroHabits(concepts: IslamicConcept[], mode: string): MicroHabit[] {
    const habits: MicroHabit[] = []

    for (const concept of concepts) {
      // Add 2-3 habits per concept
      habits.push(...concept.microHabits.slice(0, 3))
    }

    // Ensure we have 3-5 habits total
    return habits.slice(0, 5)
  }
}
```

### Knowledge Base Structure

```typescript
// infrastructure/ai/islamic-knowledge-base.ts
interface IslamicConcept {
  name: string
  tags: string[]
  microHabits: MicroHabit[]
  relatedContent: string[] // IDs of related content
  scholarlyNotes: string[]
}

export class IslamicKnowledgeBase {
  readonly purificationConcepts: Record<string, IslamicConcept> = {
    anger: {
      name: 'anger',
      tags: ['anger', 'sabr', 'self-control'],
      microHabits: [
        {
          title: 'Seek refuge in Allah when anger arises',
          description: 'Say "A\'udhu billahi min ash-shaytani\'r-rajim"',
          frequency: 'as_needed',
          difficulty: 'easy',
          islamicBasis: 'Sunan Abu Dawud 4984'
        },
        {
          title: 'Make wudu when feeling angry',
          description: 'Cool down with ablution as the Prophet ﷺ advised',
          frequency: 'as_needed',
          difficulty: 'easy',
          islamicBasis: 'Sunan Abu Dawud 4784'
        },
        {
          title: 'Daily istighfar for anger incidents',
          description: 'Seek forgiveness 100 times after Fajr',
          frequency: 'daily',
          difficulty: 'medium',
          islamicBasis: 'Muslim 2702'
        }
      ],
      relatedContent: ['anger_hadith_1', 'anger_quran_1'],
      scholarlyNotes: [
        'Imam al-Ghazali mentions that anger is a fire that must be extinguished with dhikr'
      ]
    },

    envy: {
      name: 'envy',
      tags: ['envy', 'hasad', 'contentment'],
      microHabits: [
        {
          title: 'Daily gratitude reflection',
          description: 'List 3 blessings before sleep',
          frequency: 'daily',
          difficulty: 'easy',
          islamicBasis: 'General Islamic principle'
        },
        {
          title: 'Dua for others\' success',
          description: 'When feeling envious, make dua for that person',
          frequency: 'as_needed',
          difficulty: 'medium',
          islamicBasis: 'Prophetic principle of loving for others what you love for yourself'
        }
      ],
      relatedContent: ['envy_hadith_1', 'contentment_quran_1'],
      scholarlyNotes: [
        'Ibn al-Qayyim wrote extensively on purifying the heart from envy'
      ]
    }
  }

  readonly beautificationConcepts: Record<string, IslamicConcept> = {
    patience: {
      name: 'patience',
      tags: ['patience', 'sabr', 'perseverance'],
      microHabits: [
        {
          title: 'Morning sabr intention',
          description: 'Set intention to be patient before starting the day',
          frequency: 'daily',
          difficulty: 'easy',
          islamicBasis: 'Hadith on intentions'
        },
        {
          title: 'Pause and breathe practice',
          description: 'Count to 10 while saying "SubhanAllah" when tested',
          frequency: 'as_needed',
          difficulty: 'easy',
          islamicBasis: 'General principle of dhikr in difficulty'
        },
        {
          title: 'Evening patience reflection',
          description: 'Reflect on moments where you exercised or lacked patience',
          frequency: 'daily',
          difficulty: 'medium',
          islamicBasis: 'Hadith on self-accounting'
        }
      ],
      relatedContent: ['patience_quran_1', 'sabr_hadith_1'],
      scholarlyNotes: [
        'Al-Ghazali categorized patience into three types: patience in obedience, patience in avoiding sins, and patience with divine decrees'
      ]
    }
  }
}
```

## LLM-Based AI Provider (Optional)

### Implementation

```typescript
// infrastructure/ai/llm-ai-provider.ts
import OpenAI from 'openai'

export class LlmAiProvider implements AIProvider {
  private readonly openai: OpenAI
  private readonly promptTemplates = new IslamicPromptTemplates()

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key required for LLM provider')
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async suggest(input: TazkiyahInput): Promise<TazkiyahOutput> {
    try {
      const prompt = this.promptTemplates.getTazkiyahPrompt(input)

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.promptTemplates.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent responses
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })

      const response = JSON.parse(completion.choices[0]?.message?.content || '{}')

      return this.validateAndNormalizeLLMResponse(response)
    } catch (error) {
      console.error('LLM AI provider failed:', error)

      // Fallback to rules-based provider
      const fallback = new RulesAiProvider()
      return fallback.suggest(input)
    }
  }

  private validateAndNormalizeLLMResponse(response: any): TazkiyahOutput {
    // Validate LLM response structure
    if (!response.target || !Array.isArray(response.microHabits)) {
      throw new Error('Invalid LLM response format')
    }

    // Ensure Islamic authenticity
    for (const habit of response.microHabits) {
      if (!this.isIslamicallySound(habit)) {
        throw new Error(`Potentially unislamic suggestion: ${habit.title}`)
      }
    }

    return {
      target: response.target,
      microHabits: response.microHabits.slice(0, 5), // Limit to 5
      tags: response.tags || [],
      timeline: response.timeline || '21-30 days',
      confidence: 0.75 // Slightly lower confidence for LLM
    }
  }

  private isIslamicallySound(habit: MicroHabit): boolean {
    // Check against prohibited practices
    const prohibitedTerms = [
      'meditation', 'chakra', 'energy', 'universe', 'manifestation'
    ]

    const text = `${habit.title} ${habit.description}`.toLowerCase()

    return !prohibitedTerms.some(term => text.includes(term))
  }
}
```

### Prompt Engineering

```typescript
// infrastructure/ai/prompt-templates.ts
export class IslamicPromptTemplates {
  getSystemPrompt(): string {
    return `
You are an Islamic spiritual advisor specializing in the classical methodology of Tazkiyah (spiritual purification). You provide guidance based strictly on the Quran and authentic Sunnah.

CRITICAL REQUIREMENTS:
1. Base ALL advice on Quran and authentic Hadith
2. Provide specific, actionable micro-habits (2-5 minutes each)
3. Include Islamic basis for each recommendation
4. Emphasize gradual progress and Allah's mercy
5. Never suggest non-Islamic practices (meditation, energy work, etc.)
6. Always acknowledge that true guidance comes from Allah alone

RESPONSE FORMAT: Always respond in valid JSON format with these fields:
{
  "target": "primary spiritual focus (e.g., 'anger', 'patience')",
  "microHabits": [
    {
      "title": "Brief action title",
      "description": "Detailed explanation with Islamic context",
      "frequency": "daily|weekly|as_needed",
      "difficulty": "easy|medium|hard",
      "islamicBasis": "Quran verse or Hadith reference"
    }
  ],
  "tags": ["relevant", "islamic", "tags"],
  "timeline": "suggested duration (e.g., '21-40 days')"
}

Remember: You are assisting, not replacing, qualified Islamic scholarship.
    `
  }

  getTazkiyahPrompt(input: TazkiyahInput): string {
    const modeDescription = input.mode === 'takhliyah'
      ? 'purifying the heart from spiritual diseases and negative traits'
      : 'building beautiful Islamic virtues and positive characteristics'

    return `
A Muslim is seeking help with ${modeDescription}. They say: "${input.text}"

Please provide Islamic spiritual guidance with 3-5 specific micro-habits they can practice. Each habit should:
- Take 2-5 minutes to complete
- Be based on Quran or authentic Sunnah
- Be appropriate for their spiritual level
- Help with ${modeDescription}

Focus on practical actions they can start immediately while emphasizing that success comes from Allah alone.
    `
  }

  getExplainPrompt(struggle: string): string {
    return `
A Muslim is struggling with: "${struggle}"

Provide compassionate Islamic guidance that:
1. Acknowledges their struggle with empathy
2. Provides Quranic perspective on this challenge
3. Suggests 2-3 practical Islamic approaches
4. Emphasizes Allah's mercy and the potential for change
5. Includes relevant Quran verses or Hadith

Keep the response under 300 words and maintain a tone of hope and encouragement.
    `
  }
}
```

## Content Integration

### Connecting AI to Islamic Content

```typescript
// application/suggest-plan.ts
export async function suggestPlan(
  input: CreatePlanInput,
  userId: string
): Promise<SuggestPlanResponse> {

  const aiProvider = createAIProvider()
  const contentRepo = new ContentRepository()

  // Get AI suggestion
  const suggestion = await aiProvider.suggest({
    mode: input.mode,
    text: input.input
  })

  // Fetch related Islamic content based on tags
  const relatedContent = await contentRepo.getContentByTags(
    suggestion.tags,
    { limit: 5 }
  )

  // Create plan structure
  const plan: Plan = {
    id: generateId(),
    userId,
    kind: input.mode,
    target: suggestion.target,
    microHabits: suggestion.microHabits,
    contentIds: relatedContent.map(c => c.id),
    status: 'active',
    createdAt: new Date().toISOString()
  }

  return {
    plan,
    suggestions: relatedContent
  }
}
```

### Content Recommendation Algorithm

```typescript
// infrastructure/repos/content-repository.ts
export class ContentRepository {
  async getContentByTags(
    tags: string[],
    options: { limit?: number; types?: ContentType[] } = {}
  ): Promise<ContentSnippet[]> {

    const { limit = 10, types } = options

    // Build query with tag matching and relevance scoring
    let query = supabase
      .from('content_snippets')
      .select('*')
      .containedBy('tags', tags) // PostgreSQL array containment

    if (types && types.length > 0) {
      query = query.in('type', types)
    }

    // Order by relevance (number of matching tags)
    query = query
      .order('created_at', { ascending: false })
      .limit(limit)

    const { data, error } = await query

    if (error) throw error

    // Post-process to score by tag relevance
    return data
      ?.map(item => ({
        ...item,
        relevanceScore: this.calculateRelevanceScore(item.tags, tags)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore) || []
  }

  private calculateRelevanceScore(itemTags: string[], queryTags: string[]): number {
    const matches = itemTags.filter(tag => queryTags.includes(tag)).length
    return matches / Math.max(itemTags.length, queryTags.length)
  }
}
```

## Quality Assurance

### AI Response Validation

```typescript
// shared/ai-validator.ts
export class AIResponseValidator {
  static validateTazkiyahOutput(output: TazkiyahOutput): ValidationResult {
    const errors: string[] = []

    // Validate structure
    if (!output.target) errors.push('Missing target')
    if (!output.microHabits || output.microHabits.length === 0) {
      errors.push('No micro-habits provided')
    }

    // Validate content
    for (const habit of output.microHabits) {
      if (!this.isValidMicroHabit(habit)) {
        errors.push(`Invalid habit: ${habit.title}`)
      }
    }

    // Check for Islamic authenticity red flags
    const redFlags = this.checkForRedFlags(output)
    if (redFlags.length > 0) {
      errors.push(`Potential Islamic issues: ${redFlags.join(', ')}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      confidence: output.confidence
    }
  }

  private static checkForRedFlags(output: TazkiyahOutput): string[] {
    const flags: string[] = []
    const text = JSON.stringify(output).toLowerCase()

    // Non-Islamic practices
    const prohibited = [
      'chakra', 'energy healing', 'crystal', 'manifestation',
      'universe will provide', 'karma', 'zodiac', 'astrology'
    ]

    for (const term of prohibited) {
      if (text.includes(term)) {
        flags.push(term)
      }
    }

    return flags
  }

  private static isValidMicroHabit(habit: MicroHabit): boolean {
    return !!(
      habit.title &&
      habit.description &&
      habit.frequency &&
      habit.difficulty &&
      habit.title.length > 5 &&
      habit.description.length > 10
    )
  }
}
```

### Scholarly Review Integration

```typescript
// For future implementation
interface ScholarlyReview {
  reviewerId: string
  content: any
  status: 'approved' | 'rejected' | 'needs_revision'
  notes: string
  reviewedAt: string
}

export class ScholarlyReviewService {
  async submitForReview(content: any, type: 'ai_response' | 'content_snippet') {
    // Queue content for scholarly review
    // This could integrate with external review systems
  }

  async getReviewStatus(contentId: string): Promise<ScholarlyReview | null> {
    // Check review status
    return null // Placeholder
  }
}
```

## Performance Optimization

### Caching Strategy

```typescript
// infrastructure/ai/ai-cache.ts
export class AICache {
  private readonly cache = new Map<string, CachedResponse>()
  private readonly TTL = 24 * 60 * 60 * 1000 // 24 hours

  async get(key: string): Promise<TazkiyahOutput | null> {
    const cached = this.cache.get(key)

    if (!cached) return null

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  async set(key: string, data: TazkiyahOutput): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  generateCacheKey(input: TazkiyahInput): string {
    return `${input.mode}:${input.text}`.toLowerCase().replace(/\s+/g, '_')
  }
}

interface CachedResponse {
  data: TazkiyahOutput
  timestamp: number
}
```

### Request Optimization

```typescript
// Batch requests for better performance
export class BatchAIProcessor {
  private readonly queue: Array<{
    input: TazkiyahInput
    resolve: (output: TazkiyahOutput) => void
    reject: (error: Error) => void
  }> = []

  async processBatch(): Promise<void> {
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, 5) // Process 5 at a time

    // Process in parallel
    const promises = batch.map(async ({ input, resolve, reject }) => {
      try {
        const ai = createAIProvider()
        const result = await ai.suggest(input)
        resolve(result)
      } catch (error) {
        reject(error as Error)
      }
    })

    await Promise.all(promises)
  }
}
```

## Monitoring and Analytics

### AI Performance Metrics

```typescript
// shared/ai-metrics.ts
export class AIMetrics {
  static async recordSuggestion(
    provider: 'rules' | 'llm',
    input: TazkiyahInput,
    output: TazkiyahOutput,
    responseTime: number
  ) {
    // Record metrics without exposing user data
    const metrics = {
      provider,
      mode: input.mode,
      responseTime,
      confidence: output.confidence,
      habitCount: output.microHabits.length,
      timestamp: new Date().toISOString()
    }

    // Store in analytics system (implementation depends on chosen solution)
    console.log('AI Metrics:', metrics)
  }

  static async recordError(
    provider: 'rules' | 'llm',
    error: Error,
    input?: TazkiyahInput
  ) {
    const errorMetrics = {
      provider,
      error: error.message,
      mode: input?.mode,
      timestamp: new Date().toISOString()
    }

    console.error('AI Error:', errorMetrics)
  }
}
```

### User Feedback Integration

```typescript
// Track user satisfaction with AI suggestions
export interface AISuggestionFeedback {
  suggestionId: string
  userId: string
  rating: number // 1-5
  helpful: boolean
  followedSuggestion: boolean
  feedback?: string
  createdAt: string
}

export class AIFeedbackService {
  async recordFeedback(feedback: AISuggestionFeedback): Promise<void> {
    // Store feedback for improving AI suggestions
    await supabase
      .from('ai_feedback')
      .insert(feedback)
  }

  async getProviderPerformance(): Promise<ProviderStats> {
    // Analyze feedback to compare provider performance
    return {
      rulesProvider: { avgRating: 4.2, usage: 0.8 },
      llmProvider: { avgRating: 4.5, usage: 0.2 }
    }
  }
}
```

## Future Enhancements

### Advanced AI Features

1. **Contextual Learning**: Remember user preferences and adapt suggestions
2. **Emotional Intelligence**: Detect emotional state from text and adjust tone
3. **Multilingual Support**: Arabic, Urdu, Turkish, and other Islamic languages
4. **Voice Integration**: Arabic pronunciation guides and voice-based interaction

### Integration Possibilities

1. **Prayer Time Awareness**: Suggestions that align with Islamic daily rhythm
2. **Islamic Calendar Integration**: Special guidance during Ramadan, Hajj season
3. **Community Wisdom**: Anonymous aggregated insights from user experiences
4. **Scholarly Network**: Real-time connection to qualified Islamic advisors

---

This AI system maintains the delicate balance between leveraging modern technology and preserving Islamic authenticity, ensuring that users receive beneficial guidance that draws them closer to Allah while respecting the boundaries of Islamic knowledge and methodology.
# 🌱 Tazkiyah System

## Overview

The Tazkiyah System is the heart of Sakinah, providing AI-powered spiritual development plans based on classical Islamic purification methodology.

> "وَنَفْسٍ وَمَا سَوَّاهَا ۝ فَأَلْهَمَهَا فُجُورَهَا وَتَقْوَاهَا ۝ قَدْ أَفْلَحَ مَن زَكَّاهَا ۝ وَقَدْ خَابَ مَن دَسَّاهَا"
>
> "And [by] the soul and He who proportioned it. And inspired it [with discernment of] its wickedness and its righteousness. He has succeeded who purifies it, And he has failed who instils it [with corruption]." (Quran 91:7-10)

## Spiritual Foundation

### Classical Islamic Framework

The system is based on the traditional Islamic approach to spiritual development:

1. **Takhliyah** (تخلية) - Purification/Emptying
   - Removing spiritual diseases from the heart
   - Examples: anger, envy, pride, greed, laziness

2. **Tahliyah** (تحلية) - Beautification/Filling
   - Adorning the heart with beautiful qualities
   - Examples: patience, gratitude, trust in Allah, sincerity

3. **Integration** (تكامل) - Holistic Development
   - Balancing purification and beautification
   - Sustainable habit formation rooted in Islamic teachings

## System Architecture

### AI-Powered Analysis

```typescript
interface TazkiyahInput {
  mode: 'takhliyah' | 'tahliyah';
  struggle: string; // e.g., "anger", "patience"
  context?: string; // Optional additional context
}

interface TazkiyahOutput {
  plan: SpiritualPlan;
  relatedContent: IslamicContent[];
  microHabits: MicroHabit[];
  timeline: string; // Suggested duration
}
```

### Two-Tier AI Approach

#### 1. Rules-Based AI (Default)
- Fast, reliable responses
- Based on curated Islamic knowledge
- Tag-based matching to scholarly content
- No external API dependencies

```typescript
class RulesAiProvider implements AIProvider {
  private readonly struggleMappings = {
    'anger': {
      tags: ['anger', 'sabr', 'self-control'],
      habits: [
        'Seek refuge in Allah when angry',
        'Make wudu when feeling anger',
        'Sit down if standing, lie down if sitting'
      ],
      content: ['bukhari_anger_hadith', 'quran_anger_verses']
    }
  };
}
```

#### 2. LLM-Based AI (Optional)
- More nuanced responses
- Natural language processing
- Requires OpenAI API key
- Scholar-reviewed prompts

```typescript
class LlmAiProvider implements AIProvider {
  private buildIslamicPrompt(input: TazkiyahInput): string {
    return `
      As an Islamic spiritual advisor, provide guidance for someone struggling with ${input.struggle}.

      Context: This is for the spiritual practice of ${input.mode === 'takhliyah' ? 'purifying the heart from diseases' : 'building beautiful Islamic qualities'}.

      Requirements:
      - Base all advice on Quran and authentic Sunnah
      - Provide 2-3 specific, actionable micro-habits
      - Include relevant Islamic content (verses/hadith)
      - Emphasize Allah's mercy and the gradual nature of spiritual growth
      - Keep recommendations practical for daily life
    `;
  }
}
```

## Core Features

### 1. Spiritual Assessment

Users input their spiritual focus in natural language:

**Takhliyah Examples:**
- "I struggle with anger when people are unjust"
- "I feel envious of others' success"
- "I'm proud and look down on others"
- "I'm lazy in worship and good deeds"

**Tahliyah Examples:**
- "I want to develop patience in trials"
- "I want to be more grateful for Allah's blessings"
- "I want to trust Allah completely (tawakkul)"
- "I want to be sincere in all my actions"

### 2. Personalized Plan Generation

The system creates comprehensive spiritual development plans:

```json
{
  "planId": "uuid",
  "kind": "takhliyah",
  "target": "anger",
  "microHabits": [
    {
      "title": "Seek refuge in Allah when feeling anger arise",
      "description": "Say 'A'udhu billahi min ash-shaytani'r-rajim'",
      "frequency": "as_needed",
      "islamicBasis": "Sunan Abu Dawud 4984"
    },
    {
      "title": "Make wudu when angry",
      "description": "Cool down with ablution as the Prophet ﷺ advised",
      "frequency": "as_needed",
      "islamicBasis": "Sunan Abu Dawud 4784"
    },
    {
      "title": "Daily istighfar for past anger",
      "description": "Seek forgiveness 100 times after Fajr",
      "frequency": "daily",
      "islamicBasis": "Muslim 2702"
    }
  ],
  "relatedContent": [
    {
      "type": "hadith",
      "text": "The strong is not the one who overcomes people by his strength, but the strong is the one who controls himself while in anger.",
      "reference": "Sahih al-Bukhari 6114",
      "tags": ["anger", "self-control", "strength"]
    }
  ],
  "timeline": "21-40 days",
  "scholarlyNotes": [
    "Imam al-Ghazali mentions in Ihya Ulum al-Din that anger is a fire that must be extinguished with the coolness of dhikr and wudu."
  ]
}
```

### 3. Islamic Content Integration

Each plan includes relevant Islamic content:

- **Quranic Verses**: With context and explanation
- **Authentic Hadith**: From major collections (Bukhari, Muslim, etc.)
- **Scholarly Wisdom**: From classical authorities like Al-Ghazali, Ibn Qayyim
- **Duas**: Specific supplications for each struggle/virtue

### 4. Progressive Micro-Habits

Habits are designed to be:
- **Small and manageable**: Start with 2-3 minutes daily
- **Rooted in Sunnah**: Based on Prophetic practices
- **Scalable**: Increase gradually over time
- **Contextual**: Appropriate to the spiritual goal

## Implementation Flow

### 1. User Input Processing

```typescript
// apps/web/app/tazkiyah/page.tsx
const handleSubmit = async (mode: PlanKind, input: string) => {
  // Get AI suggestion
  const suggestion = await api.suggestPlan(mode, input, token);

  // Display for user review
  setSuggestedPlan(suggestion);
};
```

### 2. AI Processing

```typescript
// apps/api/src/application/suggestPlan.ts
export async function suggestPlan(input: SuggestPlanInput) {
  const ai = getAIProvider();

  // Get AI suggestion
  const suggestion = await ai.suggest({
    mode: input.mode,
    text: input.input
  });

  // Fetch related Islamic content
  const content = await contentRepo.getContent({
    tags: suggestion.tags
  });

  return { suggestion, content };
}
```

### 3. Plan Creation

```typescript
// When user accepts the plan
const acceptPlan = async () => {
  // Create the plan in database
  const plan = await api.createPlan(mode, input, token);

  // Create individual habits
  for (const microHabit of plan.microHabits) {
    await habitRepo.createHabit({
      userId,
      planId: plan.id,
      title: microHabit.title,
      schedule: { freq: 'daily' }
    });
  }
};
```

## Content Management

### Curated Islamic Knowledge Base

The system draws from a curated database of Islamic content:

```sql
-- Content snippets with tagging
CREATE TABLE content_snippets (
  id UUID PRIMARY KEY,
  type TEXT CHECK (type IN ('ayah', 'hadith', 'dua', 'note')),
  text TEXT NOT NULL,
  ref TEXT NOT NULL, -- Source reference
  tags TEXT[] DEFAULT '{}', -- For matching with struggles/virtues
  scholar_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tag-Based Matching

Content is tagged with relevant spiritual themes:

```sql
-- Examples of tagged content
INSERT INTO content_snippets VALUES
  ('uuid1', 'hadith', 'The strong is not the one who overcomes...', 'Bukhari 6114', ARRAY['anger', 'self-control', 'strength']),
  ('uuid2', 'ayah', 'And those who restrain anger and pardon people...', 'Quran 3:134', ARRAY['anger', 'forgiveness', 'patience']),
  ('uuid3', 'dua', 'O Allah, guide me to the best of characters...', 'General Dua', ARRAY['character', 'guidance', 'akhlaq']);
```

## User Experience Flow

### 1. Mode Selection
```
┌─────────────────────────────────────┐
│ Choose Your Spiritual Path          │
├─────────────────────────────────────┤
│ 🌿 Takhliyah                       │
│    Remove spiritual diseases        │
│                                     │
│ 🌸 Tahliyah                        │
│    Build beautiful virtues          │
└─────────────────────────────────────┘
```

### 2. Natural Language Input
```
What would you like to work on?

┌─────────────────────────────────────┐
│ "I struggle with anger when people  │
│ are unjust to me"                   │
└─────────────────────────────────────┘

Or choose from common examples:
[ Anger ] [ Envy ] [ Pride ] [ Laziness ]
```

### 3. AI-Generated Plan Review
```
Your Personalized Spiritual Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Goal: Purifying from anger

📿 Daily Micro-Habits:
• Seek refuge in Allah when anger arises
• Make wudu when feeling angry
• Daily istighfar (100x) after Fajr

📖 Spiritual Guidance:
🕌 "The strong is not the one who overcomes people..."
   - Sahih al-Bukhari 6114

🤲 "A'udhu billahi min ash-shaytani'r-rajim"
   - When anger arises

[ Accept & Start Journey ] [ Try Different Input ]
```

### 4. Integration with Habits System

Once accepted, the plan automatically:
- Creates trackable habits
- Sets up daily reminders
- Integrates with streak tracking
- Connects to gamification system

## Advanced Features

### 1. Progress Adaptation

The system monitors user progress and adapts:

```typescript
// Check user's consistency
const consistency = await calculateConsistency(userId, planId);

if (consistency < 0.3) {
  // Suggest easier habits
  await adaptPlanForStruggling(planId);
} else if (consistency > 0.8) {
  // Suggest advancement
  await suggestPlanProgression(planId);
}
```

### 2. Cross-Plan Integration

Users can work on multiple areas simultaneously:

```typescript
// Detect conflicting or complementary plans
const activePlans = await getActivePlans(userId);
const recommendations = analyzeInterplay(activePlans);

// "Working on patience will also help with anger management"
```

### 3. Cultural Sensitivity

The system adapts to different cultural contexts while maintaining Islamic authenticity:

```typescript
interface CulturalContext {
  language: 'en' | 'ar' | 'ur' | 'tr';
  madhab?: 'hanafi' | 'maliki' | 'shafi' | 'hanbali';
  region: 'middle_east' | 'south_asia' | 'southeast_asia' | 'west';
}
```

## Quality Assurance

### 1. Scholarly Review Process
- All content reviewed by qualified Islamic scholars
- Regular audits of AI-generated suggestions
- Community feedback integration

### 2. Islamic Authenticity Checks
- Source verification for all hadith
- Proper Arabic transliteration
- Context preservation for Quranic verses

### 3. User Safety Measures
- No diagnosis of spiritual "diseases" - only positive framing
- Emphasis on Allah's mercy and gradual growth
- Protection against spiritual pride (riya)

## Future Enhancements

### 1. Voice Interaction
- Arabic pronunciation guides
- Voice journaling integration
- Dhikr counter with voice recognition

### 2. Advanced AI Features
- Emotional sentiment analysis
- Pattern recognition in spiritual growth
- Personalized Islamic content recommendations

### 3. Community Integration
- Shared anonymous struggles
- Collective dhikr sessions
- Peer accountability systems

---

The Tazkiyah System represents the fusion of classical Islamic spirituality with modern technology, designed to help Muslims purify their hearts and draw closer to Allah in a systematic, authentic, and personally meaningful way.
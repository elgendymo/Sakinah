# Survey UI Components

A comprehensive set of reusable UI components for the Tazkiyah Onboarding Survey system, designed with Islamic aesthetics, bilingual support (English/Arabic), and accessibility in mind.

## Components

### ProgressIndicator

A progress indicator that shows survey completion status with multiple display variants.

```tsx
import { ProgressIndicator } from '@/components/survey';

<ProgressIndicator
  currentPhase={2}
  totalPhases={4}
  percentage={50}
  variant="default" // "default" | "minimal" | "detailed"
  showPercentage={true}
  showStepText={true}
/>
```

**Features:**
- Animated progress bar with Islamic color scheme
- Multiple variants (default, minimal, detailed)
- Smooth transitions and hover effects
- Responsive design

### LikertScale

A 5-point Likert scale component with visual indicators and bilingual support.

```tsx
import { LikertScale } from '@/components/survey';

<LikertScale
  value={3}
  onChange={(value) => console.log(value)}
  language="en" // "en" | "ar"
  variant="default" // "default" | "compact" | "detailed"
  showLabels={true}
  showNumbers={true}
  disabled={false}
/>
```

**Features:**
- Color-coded options (emerald for low, gold for medium, rose for high)
- Bilingual labels (English/Arabic)
- Multiple display variants
- Accessible with proper ARIA labels
- Animation and hover effects

### QuestionCard

A comprehensive card component for displaying survey questions with bilingual support.

```tsx
import { QuestionCard } from '@/components/survey';

<QuestionCard
  number={1}
  titleEn="Envy and Jealousy"
  titleAr="الحسد والغيرة"
  questionEn="How often do you feel envious?"
  questionAr="كم مرة تشعر بالحسد؟"
  value={null}
  onChange={(value) => console.log(value)}
  note=""
  onNoteChange={(note) => console.log(note)}
  language="en"
  showBilingualToggle={true}
  variant="default" // "default" | "compact" | "detailed"
/>
```

**Features:**
- Bilingual content with expandable secondary language
- Integrated Likert scale
- Optional note-taking functionality
- Completion status indicator
- RTL support for Arabic
- Smooth animations and transitions

### NavigationButtons

Navigation buttons for survey progression with multiple variants and progress indicators.

```tsx
import { NavigationButtons } from '@/components/survey';

<NavigationButtons
  onNext={() => console.log('next')}
  onBack={() => console.log('back')}
  showBack={true}
  nextDisabled={false}
  loading={false}
  language="en"
  variant="default" // "default" | "floating" | "minimal"
  progress={50}
  nextLabel="Continue"
  backLabel="Back"
/>
```

**Features:**
- Multiple variants (default, floating for mobile, minimal)
- Progress indicator integration
- Bilingual labels
- Loading states
- Haptic feedback for mobile
- RTL support

## Hooks

### useSurveyLanguage

Manages survey language state and RTL support.

```tsx
import { useSurveyLanguage } from '@/components/survey';

const {
  language,
  setLanguage,
  isRTL,
  toggleLanguage,
  getLocalizedText
} = useSurveyLanguage('en');
```

**Features:**
- Persistent language preference in localStorage
- Automatic document direction and class management
- Utility functions for localized content

### useSurveyValidation

Provides comprehensive validation for survey responses and navigation logic.

```tsx
import { useSurveyValidation } from '@/components/survey';

const {
  validation,
  phaseValidation,
  navigation,
  canAdvanceToNextPhase,
  getPhaseCompletionPercentage,
  getOverallCompletionPercentage
} = useSurveyValidation({
  currentPhase: 1,
  responses: {},
  reflectionAnswers: undefined
});
```

**Features:**
- Phase-by-phase validation
- Progress calculation
- Navigation state management
- Error and warning detection

## Data and Utilities

### Survey Questions

Pre-defined survey questions with bilingual content:

```tsx
import {
  surveyQuestions,
  getQuestionsByPhase,
  getQuestionById
} from '@/components/survey';

const phase1Questions = getQuestionsByPhase(1);
const envyQuestion = getQuestionById('envy');
```

## Design Principles

### Islamic Aesthetics
- Emerald and gold color scheme reflecting Islamic art
- Geometric patterns and gradients
- Smooth, respectful animations
- Sacred geometry-inspired layouts

### Accessibility
- WCAG 2.1 AA compliance
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### Responsive Design
- Mobile-first approach
- Touch-friendly interactions
- Floating navigation for mobile
- Safe area support for modern devices

### Bilingual Support
- Complete English/Arabic translation
- RTL layout support
- Arabic typography (Noto Kufi Arabic, Amiri, Tajawal)
- Dynamic text direction switching

### Performance
- Framer Motion for optimized animations
- Lazy loading of secondary language content
- Efficient re-rendering patterns
- Minimal bundle impact

## Usage Examples

### Basic Survey Page

```tsx
import React, { useState } from 'react';
import {
  ProgressIndicator,
  QuestionCard,
  NavigationButtons,
  useSurveyLanguage,
  useSurveyValidation,
  getQuestionsByPhase
} from '@/components/survey';

export default function SurveyPage() {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [responses, setResponses] = useState({});
  const { language, toggleLanguage } = useSurveyLanguage();

  const questions = getQuestionsByPhase(currentPhase);
  const currentQuestion = questions[0];

  const { navigation } = useSurveyValidation({
    currentPhase,
    responses,
    reflectionAnswers: undefined
  });

  return (
    <div>
      <ProgressIndicator
        currentPhase={currentPhase}
        totalPhases={4}
        percentage={navigation.progressPercentage}
      />

      {currentQuestion && (
        <QuestionCard
          {...currentQuestion}
          value={responses[currentQuestion.questionId]}
          onChange={(value) => setResponses(prev => ({
            ...prev,
            [currentQuestion.questionId]: value
          }))}
          language={language}
        />
      )}

      <NavigationButtons
        onNext={() => setCurrentPhase(prev => prev + 1)}
        onBack={() => setCurrentPhase(prev => prev - 1)}
        showBack={currentPhase > 1}
        nextDisabled={!navigation.canGoNext}
        language={language}
      />
    </div>
  );
}
```

### Mobile-Optimized Survey

```tsx
<NavigationButtons
  variant="floating"
  progress={75}
  onNext={handleNext}
  onBack={handleBack}
  language={language}
/>
```

### Compact Question Display

```tsx
<QuestionCard
  variant="compact"
  showBilingualToggle={false}
  // ... other props
/>
```

## Testing

Comprehensive test coverage includes:
- Unit tests for all components
- Integration tests for component interactions
- Accessibility testing
- RTL/LTR layout testing
- Performance testing
- Mobile interaction testing

Run tests with:
```bash
npm test survey/
```

## Styling

Components use Tailwind CSS with custom Islamic design tokens:
- `emerald-*` for positive/safe states
- `gold-*` for neutral/warning states
- `rose-*` for negative/critical states
- `sage-*` for text and backgrounds

Custom CSS classes:
- `.arabic-text` - Arabic typography
- `.arabic-body` - Arabic body text
- `.arabic-heading` - Arabic headings
- `.quran-text` - Quranic verse styling
- `.card-islamic` - Islamic card styling
- `.rtl` - RTL layout support

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile browsers (iOS Safari, Chrome Mobile)
- RTL text support
- CSS Grid and Flexbox
- CSS Custom Properties

## Contributing

When contributing to survey components:

1. Follow existing patterns and naming conventions
2. Ensure bilingual support for all user-facing text
3. Test RTL layout thoroughly
4. Include comprehensive unit tests
5. Follow Islamic design principles
6. Maintain accessibility standards

## Related Documentation

- [Tazkiyah Onboarding Spec](../../.claude/specs/tazkiyah-onboarding/)
- [Islamic Design System](../README.md)
- [Accessibility Guidelines](../../../docs/accessibility.md)
- [Testing Guidelines](../../../docs/testing.md)
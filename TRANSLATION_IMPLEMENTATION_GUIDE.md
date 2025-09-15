# Translation Implementation Guide

## Overview
This guide details the hardcoded text found in components that needs to be replaced with translation keys to complete the localization of the Sakinah app.

## Translation Files
- ✅ **Arabic (`ar.json`)**: 20 sections, 500+ translation keys
- ✅ **English (`en.json`)**: 20 sections, 500+ translation keys
- ✅ **Structure**: Both files have identical structure and coverage

## Components Requiring Translation Updates

### 1. **Page Titles & Subtitles**

#### `/app/page.tsx` (Home Page)
Replace hardcoded strings:
```tsx
// Current hardcoded text:
title="Nurture Your Soul with Sacred Wisdom"
subtitle="Divinely-inspired tools to purify your heart and strengthen your connection with Allah"
title="Your Path to Inner Peace"
subtitle="Simple steps to begin your spiritual transformation"

// Replace with:
title={t('pages.home.title')}
subtitle={t('pages.home.subtitle')}
title={t('pages.home.pathToInnerPeace')}
subtitle={t('pages.home.spiritualTransformation')}
```

#### `/app/habits/page.tsx`
```tsx
// Current:
title="Today's Habits"

// Replace with:
title={t('pages.habits.title')}
```

#### `/app/checkin/page.tsx`
```tsx
// Current:
title="Daily Muhasabah"
subtitle="Reflect on your day and set intentions with Allah's guidance"

// Replace with:
title={t('pages.checkin.title')}
subtitle={t('pages.checkin.subtitle')}
```

#### `/app/tazkiyah/page.tsx`
```tsx
// Current:
title="Begin Your Tazkiyah Journey"
subtitle="Choose your path of spiritual purification"

// Replace with:
title={t('pages.tazkiyah.title')}
subtitle={t('pages.tazkiyah.subtitle')}
```

#### `/app/content/page.tsx`
```tsx
// Current:
title="Content Library"
subtitle="Browse Quranic verses, Hadith, duas, and spiritual guidance"

// Replace with:
title={t('pages.content.title')}
subtitle={t('pages.content.subtitle')}
```

#### `/app/journal/page.tsx`
```tsx
// Current:
title="Spiritual Journal"
subtitle="A private space for your thoughts and reflections"

// Replace with:
title={t('pages.journal.title')}
subtitle={t('pages.journal.subtitle')}
```

#### `/app/profile/page.tsx`
```tsx
// Current:
title="Profile & Settings"
subtitle="Manage your spiritual journey preferences"

// Replace with:
title={t('pages.profile.title')}
subtitle={t('pages.profile.subtitle')}
```

### 2. **Static Text & Labels**

#### `/app/tazkiyah/page.tsx`
```tsx
// Current hardcoded text:
<div className="font-semibold text-sage-900">Takhliyah</div>
<div className="text-sm text-gray-600 mt-1">Remove spiritual diseases</div>
<div className="font-semibold text-sage-900">Taḥliyah</div>
<div className="text-sm text-gray-600 mt-1">Build beautiful virtues</div>

// Replace with:
<div className="font-semibold text-sage-900">{t('pages.tazkiyah.takhliyah')}</div>
<div className="text-sm text-gray-600 mt-1">{t('pages.tazkiyah.takhliyahDesc')}</div>
<div className="font-semibold text-sage-900">{t('pages.tazkiyah.tahliyah')}</div>
<div className="text-sm text-gray-600 mt-1">{t('pages.tazkiyah.tahliyahDesc')}</div>
```

#### `/app/habits/page.tsx`
```tsx
// Current:
<div className="text-emerald-600">Loading habits...</div>
<h2 className="text-xl font-semibold mb-2">Today's Progress</h2>
<p className="text-sage-600 mb-4">No habits yet</p>

// Replace with:
<div className="text-emerald-600">{t('texts.loadingHabits')}</div>
<h2 className="text-xl font-semibold mb-2">{t('texts.todaysProgress')}</h2>
<p className="text-sage-600 mb-4">{t('texts.noHabitsYet')}</p>
```

#### `/app/journal/page.tsx`
```tsx
// Current:
<p className="text-sage-600 mb-4">No journal entries yet</p>
<div className="text-sm text-sage-600 mb-2">Click to use a prompt:</div>
placeholder="Write your thoughts, reflections, duas, or spiritual insights..."

// Replace with:
<p className="text-sage-600 mb-4">{t('texts.noJournalEntries')}</p>
<div className="text-sm text-sage-600 mb-2">{t('pages.journal.clickPrompt')}</div>
placeholder={t('pages.journal.writePlaceholder')}
```

### 3. **Error Components**

#### `/components/ErrorBoundary.tsx` & `/components/ErrorDisplay.tsx`
```tsx
// Current hardcoded error labels:
<strong>Error Code:</strong>
<strong>Category:</strong>
<strong>Severity:</strong>
<strong>Trace ID:</strong>
<strong>Timestamp:</strong>
<strong>Retryable:</strong>
<strong>Actionable:</strong>

// Replace with:
<strong>{t('texts.errorCode')}</strong>
<strong>{t('texts.category')}</strong>
<strong>{t('texts.severity')}</strong>
<strong>{t('texts.traceId')}</strong>
<strong>{t('texts.timestamp')}</strong>
<strong>{t('texts.retryable')}</strong>
<strong>{t('texts.actionable')}</strong>
```

#### `/app/global-error.tsx`
```tsx
// Current:
<h1 className="text-xl font-bold">Something Went Wrong</h1>
<p className="text-red-100">We encountered an unexpected issue</p>
<h2 className="text-lg font-semibold text-sage-900 mb-2">What happened?</h2>
<h3 className="font-medium text-emerald-800 mb-1">Remember</h3>

// Replace with:
<h1 className="text-xl font-bold">{t('texts.somethingWentWrong')}</h1>
<p className="text-red-100">{t('texts.unexpectedIssue')}</p>
<h2 className="text-lg font-semibold text-sage-900 mb-2">{t('texts.whatHappened')}</h2>
<h3 className="font-medium text-emerald-800 mb-1">{t('texts.remember')}</h3>
```

### 4. **Location & Form Components**

#### `/components/LocationSelector.tsx`
```tsx
// Current:
<h3 className="font-semibold text-gray-900">Select Location</h3>
placeholder="Search cities..."
placeholder="Enter custom city, country"

// Replace with:
<h3 className="font-semibold text-gray-900">{t('texts.selectLocation')}</h3>
placeholder={t('texts.searchCities')}
placeholder={t('texts.enterCustomCity')}
```

#### `/app/onboarding/page.tsx`
```tsx
// Current hardcoded onboarding text:
title="Welcome to Sakinah"
subtitle="Let's personalize your spiritual journey"
placeholder="How would you like to be addressed?"

// Replace with:
title={t('onboarding.welcome')}
subtitle={t('onboarding.personalizeJourney')}
placeholder={t('onboarding.howToAddress')}
```

### 5. **Placeholder Text**

#### `/app/checkin/page.tsx`
```tsx
// Current placeholders:
placeholder="I intend to remember Allah more, be patient with my family, read Quran..."
placeholder="Be honest with yourself..."
placeholder="I will try to pray with more khushu, control my temper better..."

// Replace with:
placeholder={t('pages.checkin.intentionPlaceholder')}
placeholder={t('pages.checkin.challengesPlaceholder')}
placeholder={t('pages.checkin.improvementsPlaceholder')}
```

#### `/app/profile/page.tsx`
```tsx
// Current:
placeholder="How would you like to be addressed?"

// Replace with:
placeholder={t('pages.profile.howToAddress')}
```

### 6. **Islamic Quotes & Verses**

#### `/app/page.tsx`
```tsx
// Current hardcoded quotes:
"He it is Who sent down tranquility (Sakinah) into the hearts of the believers"
translation="Indeed, Allah will not change the condition of a people until they change what is in themselves"
source="Surah Ar-Ra'd 13:11"
"Today, I intend to worship Allah with sincerity and mindfulness."
"Verily, in the remembrance of Allah do hearts find tranquility"

// Replace with:
{t('pages.home.sakinahVerseTranslation')}
translation={t('pages.home.changeYourselvesTranslation')}
source={t('pages.home.changeYourselvesSource')}
{t('pages.home.sampleIntention')}
{t('pages.home.remembranceQuote')}
```

## Implementation Steps

### Step 1: Add Translation Hooks
Ensure all components import and use the translation hook:
```tsx
import { useTranslations } from 'next-intl';

export default function ComponentName() {
  const t = useTranslations(); // or specific namespace
  // ... component code
}
```

### Step 2: Replace Hardcoded Text Systematically
Go through each component and replace hardcoded strings with translation keys following the structure in the JSON files.

### Step 3: Test Language Switching
After implementation, test that:
- All text changes when switching between English and Arabic
- RTL layout works correctly for Arabic
- No untranslated text remains visible

### Step 4: Add Missing Keys
If you find additional hardcoded text not covered in this guide, add the appropriate translation keys to both `ar.json` and `en.json` files.

## Translation Key Structure

The translation files are organized into logical sections:
- `common` - Common UI elements
- `navigation` - Navigation items
- `app` - App metadata
- `auth` - Authentication flow
- `dashboard` - Dashboard specific
- `habits` - Habits page
- `journal` - Journal page
- `tazkiyah` - Tazkiyah/purification
- `content` - Content library
- `profile` - Profile settings
- `checkin` - Daily check-in
- `settings` - App settings
- `errors` - Error messages
- `islamicTerms` - Islamic terminology
- `prayers` - Prayer-related terms
- `onboarding` - Onboarding flow
- `ui` - General UI actions
- `times` - Time-related terms
- `pages` - Page-specific content
- `texts` - Static text snippets

## Next Steps

1. **Implement translations systematically** by going through each component
2. **Test thoroughly** with both languages
3. **Add any missing translations** you discover during implementation
4. **Verify RTL support** works correctly for Arabic
5. **Ensure Islamic content** maintains proper reverence and accuracy

The translation infrastructure is now complete - the remaining work is updating the components to use these translation keys instead of hardcoded text.
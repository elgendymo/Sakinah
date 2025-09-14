import Link from 'next/link';
import {
  SectionHeader,
  AyahQuote,
  DhikrCounter,
  IntentionCard,
  PlanCard,
  PrayerTimePill,
  HabitList,
  ChipGroup,
  StruggleChip,
  type PlanItem
} from '@sakinah/ui';
import PageContainer from '@/components/PageContainer';
// import Logo from '@/components/Logo';

export default function HomePage() {
  // Sample data for demonstration
  const samplePrayerTimes = [
    { name: 'Fajr' as const, time: '5:30', passed: true },
    { name: 'Dhuhr' as const, time: '12:45', passed: true },
    { name: 'Asr' as const, time: '4:15', passed: false },
    { name: 'Maghrib' as const, time: '7:20', passed: false },
    { name: 'Isha' as const, time: '8:45', passed: false },
  ];

  const sampleHabits = [
    { id: '1', name: 'Morning Dhikr', streak: 7, completed: true },
    { id: '2', name: 'Read 1 page Quran', streak: 3, completed: false },
    { id: '3', name: 'Evening Du\'a', streak: 12, completed: true },
  ];

  const samplePlanItems: PlanItem[] = [
    { id: '1', text: 'Pray Fajr on time', type: 'habit', completed: true },
    { id: '2', text: 'Recite morning adhkar', type: 'habit', completed: false },
    { id: '3', text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', type: 'dua', completed: false },
    { id: '4', text: 'وَاصْبِرْ نَفْسَكَ مَعَ الَّذِينَ يَدْعُونَ رَبَّهُم', type: 'ayah', completed: true },
  ];

  const virtueChips = [
    { id: '1', label: 'Patience (Sabr)', variant: 'virtue' as const },
    { id: '2', label: 'Gratitude (Shukr)', variant: 'virtue' as const },
    { id: '3', label: 'Trust (Tawakkul)', variant: 'virtue' as const },
  ];

  return (
    <PageContainer
      maxWidth="xl"
      padding="xl"
      center={false}
      className="space-y-12"
    >

          {/* Welcome Section */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 text-white rounded-2xl p-8 mb-8 text-center shadow-xl shadow-emerald-200/50 islamic-pattern">
            {/* Prominent Logo in Hero - Temporarily disabled */}
            <div className="flex justify-center mb-6">
              <div className="w-[120px] h-[120px] bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border-2 border-white/30">
                <span className="text-2xl">🕌</span>
              </div>
            </div>

            <SectionHeader
              title="Welcome to Sakinah"
              subtitle="Your personal journey to spiritual purification and growth through Islamic principles. Find inner peace (sakinah) in your heart."
              level={1}
              className="text-white"
            />

            <div className="grid sm:grid-cols-3 gap-4 mt-8 text-white/90">
              <div className="flex flex-col items-center p-4">
                <span className="text-2xl mb-2">🔒</span>
                <h3 className="font-medium mb-1">Privacy-First</h3>
                <p className="text-sm text-white/80">All your data stays private between you and Allah</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <span className="text-2xl mb-2">📖</span>
                <h3 className="font-medium mb-1">Shariah-Compliant</h3>
                <p className="text-sm text-white/80">Based on authentic Quran & Sunnah teachings</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <span className="text-2xl mb-2">❤️</span>
                <h3 className="font-medium mb-1">Soul Purification</h3>
                <p className="text-sm text-white/80">Gentle guidance for your spiritual growth</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-emerald-700 font-semibold rounded-xl transition-all hover:bg-gold-50 hover:text-emerald-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Start Your Journey
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-white/50 bg-white/10 text-white font-semibold rounded-xl transition-all hover:bg-white/20 hover:border-white/70 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Continue Learning
              </Link>
            </div>
          </div>

          <SectionHeader
            title="Dashboard Preview"
            subtitle="See what your spiritual journey looks like"
            level={2}
            showDivider={true}
          />

          {/* Featured Ayah */}
          <AyahQuote
            arabic="وَاصْبِرْ نَفْسَكَ مَعَ الَّذِينَ يَدْعُونَ رَبَّهُم بِالْغَدَاةِ وَالْعَشِيِّ يُرِيدُونَ وَجْهَهُ"
            translation="Keep yourself patiently with those who call on their Lord morning and evening, seeking His Face."
            source="Surah Al-Kahf 18:28"
            className="max-w-3xl mx-auto"
          />

          {/* Prayer Times */}
          <div className="max-w-2xl mx-auto">
            <PrayerTimePill
              prayerTimes={samplePrayerTimes}
              className="mx-auto"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8">

            {/* Left Column */}
            <div className="space-y-6">

              {/* Daily Intention */}
              <IntentionCard
                defaultIntention="Today, I intend to worship Allah with sincerity, be kind to His creation, and purify my heart from negative thoughts."
                showReminder={true}
                reminderTime="Fajr"
              />

              {/* Dhikr Counter */}
              <DhikrCounter
                title="SubhanAllah"
                targetCount={33}
                enableHaptics={true}
              />

            </div>

            {/* Right Column */}
            <div className="space-y-6">

              {/* Daily Plan */}
              <PlanCard
                title="Today's Spiritual Plan"
                description="Simple actions to purify your heart and strengthen your connection with Allah"
                items={samplePlanItems}
                ctaText="Continue Journey"
              />

              {/* Habit Tracking */}
              <HabitList
                habits={sampleHabits}
              />

            </div>
          </div>

          {/* Spiritual Focus Areas */}
          <div className="space-y-4">
            <SectionHeader
              title="Choose Your Focus"
              subtitle="Select virtues to cultivate or challenges to overcome in your spiritual journey"
              level={2}
              showDivider={true}
            />

            <div className="max-w-2xl mx-auto space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-sage-600 mb-2">Virtues to Cultivate:</h4>
                <ChipGroup
                  items={virtueChips}
                  selectedIds={['1']}
                />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-sage-600 mb-2">Areas for Improvement:</h4>
                <div className="flex flex-wrap gap-2">
                  <StruggleChip label="Anger Management" />
                  <StruggleChip label="Social Media" />
                  <StruggleChip label="Procrastination" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Links */}
          <div className="text-center space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <Link href="/content" className="p-4 card-islamic rounded-xl hover:shadow-lg hover:-translate-y-0.5 hover:shadow-emerald-200/50 transition-all text-center group">
                <div className="text-2xl mb-2 text-emerald-600">📚</div>
                <h3 className="font-medium text-sage-900 mb-1">Content Library</h3>
                <p className="text-sm text-sage-600">Browse Quranic verses, Hadith, and duas</p>
              </Link>

              <Link href="/tazkiyah" className="p-4 card-islamic rounded-xl hover:shadow-lg hover:-translate-y-0.5 hover:shadow-emerald-200/50 transition-all text-center group">
                <div className="text-2xl mb-2 text-emerald-600">🌱</div>
                <h3 className="font-medium text-sage-900 mb-1">Start Tazkiyah</h3>
                <p className="text-sm text-sage-600">Begin your spiritual purification journey</p>
              </Link>

              <Link href="/habits" className="p-4 card-islamic rounded-xl hover:shadow-lg hover:-translate-y-0.5 hover:shadow-emerald-200/50 transition-all text-center group">
                <div className="text-2xl mb-2 text-gold-600">✅</div>
                <h3 className="font-medium text-sage-900 mb-1">Track Habits</h3>
                <p className="text-sm text-sage-600">Build consistent spiritual practices</p>
              </Link>

              <Link href="/checkin" className="p-4 card-islamic rounded-xl hover:shadow-lg hover:-translate-y-0.5 hover:shadow-emerald-200/50 transition-all text-center group">
                <div className="text-2xl mb-2 text-emerald-600">🌙</div>
                <h3 className="font-medium text-sage-900 mb-1">Daily Muhasabah</h3>
                <p className="text-sm text-sage-600">Self-accountability and reflection</p>
              </Link>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-sm text-sage-600 pt-8 border-t border-sage-200/50 islamic-divider">
            <p>Privacy-first • Shariah-compliant • Designed for inner peace</p>
          </div>

    </PageContainer>
  );
}
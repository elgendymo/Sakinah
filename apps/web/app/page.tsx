import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-primary-900 mb-4">
            Sakinah
          </h1>
          <p className="text-xl text-primary-700 mb-8">
            Your Journey to Spiritual Purification & Growth
          </p>

          <div className="arabic-text text-primary-800 mb-8 bg-white/50 p-6 rounded-lg">
            وَاصْبِرْ نَفْسَكَ مَعَ الَّذِينَ يَدْعُونَ رَبَّهُم بِالْغَدَاةِ وَالْعَشِيِّ يُرِيدُونَ وَجْهَهُ
          </div>

          <p className="text-primary-600 mb-12">
            "Keep yourself patiently with those who call on their Lord morning and evening, seeking His Face..." (Surah Al-Kahf: 28)
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-lg p-6 shadow-md card-hover">
              <h2 className="text-2xl font-semibold text-primary-800 mb-3">
                Takhliyah
              </h2>
              <p className="text-gray-600 mb-4">
                Purify your heart from spiritual diseases like envy, anger, and pride through guided practices
              </p>
              <Link href="/auth/login?mode=takhliyah" className="btn-primary inline-block">
                Start Purification
              </Link>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md card-hover">
              <h2 className="text-2xl font-semibold text-primary-800 mb-3">
                Taḥliyah
              </h2>
              <p className="text-gray-600 mb-4">
                Adorn your soul with beautiful virtues like patience, gratitude, and tawakkul
              </p>
              <Link href="/auth/login?mode=tahliyah" className="btn-primary inline-block">
                Build Virtues
              </Link>
            </div>
          </div>

          <div className="text-sm text-primary-600">
            <p>Privacy-first • Shariah-compliant • AI-assisted</p>
          </div>
        </div>
      </div>
    </div>
  );
}
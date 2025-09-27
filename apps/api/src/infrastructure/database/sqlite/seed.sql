-- SQLite Seed data for Sakinah app (development)
-- Content snippets with Islamic wisdom

-- Clear existing data
DELETE FROM content_snippets;

-- Create mock user for development (if not exists)
INSERT OR IGNORE INTO users (id, handle, created_at) VALUES
  ('12345678-1234-4123-8123-123456789012', 'dev-user', datetime('now'));

-- Create profile for mock user (if not exists)
INSERT OR IGNORE INTO profiles (user_id, display_name, timezone, created_at) VALUES
  ('12345678-1234-4123-8123-123456789012', 'Development User', 'UTC', datetime('now'));

-- Ayat for Envy
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And do not wish for that by which Allah has made some of you exceed others. For men is a share of what they have earned, and for women is a share of what they have earned. And ask Allah of His bounty.', 'Surah An-Nisa 4:32', '["envy", "contentment", "gratitude"]'),
  ('ayah', 'Or do they envy people for what Allah has given them of His bounty?', 'Surah An-Nisa 4:54', '["envy", "hasad"]');

-- Hadith for Envy
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'Beware of envy, for envy consumes good deeds just as fire consumes wood.', 'Sunan Abu Dawud', '["envy", "hasad"]'),
  ('hadith', 'None of you truly believes until he loves for his brother what he loves for himself.', 'Bukhari & Muslim', '["envy", "brotherhood", "love"]');

-- Duas for Envy
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('dua', 'O Allah, I seek refuge in You from the evil of the envious when he envies.', 'Surah Al-Falaq', '["envy", "protection"]'),
  ('dua', 'O Allah, purify my heart from envy and fill it with contentment.', 'General Dua', '["envy", "contentment", "purification"]');

-- Ayat for Anger
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And those who restrain anger and pardon people - and Allah loves those who do good.', 'Surah Ali Imran 3:134', '["anger", "forgiveness", "patience"]'),
  ('ayah', 'The servants of the Most Merciful are those who walk upon the earth humbly, and when the ignorant address them, they say words of peace.', 'Surah Al-Furqan 25:63', '["anger", "patience", "peace"]');

-- Hadith for Anger
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'The strong is not the one who overcomes people by his strength, but the one who controls himself while in anger.', 'Bukhari', '["anger", "self-control", "strength"]'),
  ('hadith', 'If one of you becomes angry, let him remain silent.', 'Ahmad', '["anger", "silence", "control"]');

-- Ayat for Pride
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And do not turn your face away from people in arrogance, nor walk upon the earth exultantly. Indeed, Allah does not like everyone self-deluded and boastful.', 'Surah Luqman 31:18', '["pride", "humility", "arrogance"]'),
  ('ayah', 'Indeed, He does not like the arrogant.', 'Surah An-Nahl 16:23', '["pride", "arrogance"]');

-- Hadith for Pride
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'No one who has an atoms weight of pride in his heart will enter Paradise.', 'Muslim', '["pride", "humility", "paradise"]'),
  ('hadith', 'Allah is Beautiful and loves beauty. Pride means denying the truth and looking down on people.', 'Muslim', '["pride", "beauty", "truth"]');

-- Ayat for Patience
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.', 'Surah Al-Baqarah 2:153', '["patience", "sabr", "prayer"]'),
  ('ayah', 'And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings to the patient.', 'Surah Al-Baqarah 2:155', '["patience", "test", "trials"]');

-- Hadith for Patience
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'Amazing is the affair of the believer, for all his affairs are good, and this is not for anyone except the believer.', 'Muslim', '["patience", "gratitude", "contentment"]'),
  ('hadith', 'Whoever remains patient, Allah will make him patient. Nobody can be given a blessing better and greater than patience.', 'Bukhari', '["patience", "blessing", "sabr"]');

-- Ayat for Gratitude
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'If you are grateful, I will surely increase you in favor.', 'Surah Ibrahim 14:7', '["gratitude", "shukr", "increase"]'),
  ('ayah', 'And when your Lord proclaimed, "If you are grateful, I will certainly give you more. But if you are ungrateful, My punishment is surely severe."', 'Surah Ibrahim 14:7', '["gratitude", "punishment", "blessing"]');

-- Hadith for Gratitude
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'He is not of us who does not thank Allah for His blessings, thank people for their favors, and is not thanked by people for his favors.', 'At-Tirmidhi', '["gratitude", "blessing", "thankfulness"]'),
  ('hadith', 'Look at those who are beneath you and do not look at those who are above you, for it is more suitable that you should not consider as less the blessing of Allah.', 'Muslim', '["gratitude", "contentment", "comparison"]');

-- Ayat for Tawakkul (Trust in Allah)
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose.', 'Surah At-Talaq 65:3', '["tawakkul", "trust", "reliance"]'),
  ('ayah', 'And upon Allah rely, if you should be believers.', 'Surah Al-Maidah 5:23', '["tawakkul", "belief", "faith"]');

-- Duas for Tawakkul
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('dua', 'O Allah, You are my Lord, there is no god but You. I put my trust in You and You are the Lord of the Great Throne.', 'Abu Dawud', '["tawakkul", "trust", "protection"]'),
  ('dua', 'In the name of Allah, I place my trust in Allah. There is no might and no power except with Allah.', 'At-Tirmidhi', '["tawakkul", "trust", "might"]);

-- Ayat for Dhikr (Remembrance)
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And remember your Lord much and exalt Him with praise in the evening and the morning.', 'Surah Ali Imran 3:41', '["dhikr", "remembrance", "praise"]'),
  ('ayah', 'Those who believe and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.', 'Surah Ar-Rad 13:28', '["dhikr", "hearts", "assurance"]');

-- Common Dhikr
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('dua', 'SubhanAllah (Glory be to Allah)', 'General Dhikr', '["dhikr", "praise", "glory"]'),
  ('dua', 'Alhamdulillah (All praise is due to Allah)', 'General Dhikr', '["dhikr", "praise", "gratitude"]'),
  ('dua', 'Allahu Akbar (Allah is Greatest)', 'General Dhikr', '["dhikr", "greatness", "tasbih"]'),
  ('dua', 'La hawla wa la quwwata illa billah (There is no might and no power except with Allah)', 'General Dhikr', '["dhikr", "power", "might"]');

-- Clear existing dhikr types
DELETE FROM dhikr_types;

-- Popular Dhikr Types with Arabic text, transliteration and translation
INSERT INTO dhikr_types (name, display_name, arabic_text, transliteration, translation, description, recommended_count, tags) VALUES
  ('tasbih', 'Tasbih', 'سُبْحَانَ اللَّهِ', 'SubhanAllah', 'Glory be to Allah', 'Glorifying Allah by declaring His perfection and freedom from all imperfections', 33, '["praise", "glory", "morning", "evening"]'),
  ('tahmid', 'Tahmid', 'الْحَمْدُ لِلَّهِ', 'Alhamdulillah', 'All praise is due to Allah', 'Praising Allah and acknowledging His countless blessings', 33, '["praise", "gratitude", "morning", "evening"]'),
  ('takbir', 'Takbir', 'اللَّهُ أَكْبَرُ', 'Allahu Akbar', 'Allah is Greatest', 'Declaring the supreme greatness of Allah above all things', 34, '["greatness", "majesty", "morning", "evening"]'),
  ('tahlil', 'Tahlil', 'لَا إِلَٰهَ إِلَّا اللَّهُ', 'La ilaha illa Allah', 'There is no god but Allah', 'The declaration of monotheism, affirming Allah as the only deity worthy of worship', 100, '["monotheism", "faith", "remembrance"]'),
  ('istighfar', 'Istighfar', 'أَسْتَغْفِرُ اللَّهَ', 'Astaghfirullah', 'I seek forgiveness from Allah', 'Seeking Allah''s forgiveness for sins and shortcomings', 100, '["forgiveness", "repentance", "purification"]'),
  ('hawqala', 'Hawqala', 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', 'La hawla wa la quwwata illa billah', 'There is no might and no power except with Allah', 'Acknowledging that all strength and ability come from Allah alone', 10, '["power", "strength", "reliance", "difficulty"]'),
  ('salawat', 'Salawat on Prophet', 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', 'Allahumma salli ala Muhammad', 'O Allah, send blessings upon Muhammad', 'Sending blessings upon Prophet Muhammad (peace be upon him)', 10, '["prophet", "blessings", "love"]'),
  ('dua_protection', 'Seeking Protection', 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', 'A''udhu billahi min ash-shaytani''r-rajim', 'I seek refuge in Allah from Satan, the accursed', 'Seeking Allah''s protection from evil and harm', 3, '["protection", "refuge", "evil", "safety"]'),
  ('morning_dhikr', 'Morning Remembrance', 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ', 'Asbahna wa asbahal-mulku lillah', 'We have reached the morning and the dominion belongs to Allah', 'Morning dhikr acknowledging Allah''s sovereignty', 1, '["morning", "sovereignty", "gratitude"]'),
  ('evening_dhikr', 'Evening Remembrance', 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ', 'Amsayna wa amsal-mulku lillah', 'We have reached the evening and the dominion belongs to Allah', 'Evening dhikr acknowledging Allah''s sovereignty', 1, '["evening", "sovereignty", "gratitude"]');

-- Add some general dhikr types without specific Arabic text
INSERT INTO dhikr_types (name, display_name, description, recommended_count, tags) VALUES
  ('general', 'General Dhikr', 'Any form of remembrance of Allah including personal duas and supplications', NULL, '["general", "remembrance", "dua"]'),
  ('quran_recitation', 'Quran Recitation', 'Reciting verses from the Holy Quran as a form of dhikr', NULL, '["quran", "recitation", "verses"]'),
  ('durood', 'Durood Sharif', 'Various forms of sending blessings upon the Prophet Muhammad (PBUH)', 11, '["prophet", "blessings", "durood"]');
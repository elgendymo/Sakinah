-- SQLite Seed data for Sakinah app (development)
-- Content snippets with Islamic wisdom

-- Clear existing data
DELETE FROM content_snippets;

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
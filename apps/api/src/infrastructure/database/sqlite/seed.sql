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
  ('hadith', 'No one who has an atom''s weight of pride in his heart will enter Paradise.', 'Muslim', '["pride", "humility", "paradise"]'),
  ('hadith', 'Allah is Beautiful and loves beauty. Pride means denying the truth and looking down on people.', 'Muslim', '["pride", "beauty", "truth"]');

-- Ayat for Patience
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.', 'Surah Al-Baqarah 2:153', '["patience", "prayer", "sabr"]'),
  ('ayah', 'And be patient, for indeed, Allah does not allow to be lost the reward of those who do good.', 'Surah Hud 11:115', '["patience", "reward", "good deeds"]');

-- Hadith for Patience
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'How wonderful is the affair of the believer! All of his affairs are good, and that is for no one except the believer.', 'Muslim', '["patience", "gratitude", "contentment"]'),
  ('hadith', 'Whoever remains patient, Allah will make him patient. Nobody can be given a blessing better and greater than patience.', 'Bukhari', '["patience", "blessing", "sabr"]');

-- Ayat for Gratitude
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'If you are grateful, I will surely increase you [in favor].', 'Surah Ibrahim 14:7', '["gratitude", "shukr", "increase"]'),
  ('ayah', 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.', 'Surah Al-Baqarah 2:152', '["gratitude", "remembrance", "dhikr"]');

-- Hadith for Gratitude
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'He who does not thank people, does not thank Allah.', 'Ahmad, Tirmidhi', '["gratitude", "thankfulness", "people"]'),
  ('hadith', 'Look at those below you and do not look at those above you, for it is more suitable that you should not consider as less the blessing of Allah.', 'Muslim', '["gratitude", "contentment", "perspective"]');

-- Duas for General Spiritual Growth
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('dua', 'Our Lord, do not let our hearts deviate after You have guided us and grant us from Yourself mercy.', 'Surah Ali Imran 3:8', '["guidance", "mercy", "steadfastness"]'),
  ('dua', 'O Allah, I ask You for beneficial knowledge, good provision, and acceptable deeds.', 'Ibn Majah', '["knowledge", "provision", "deeds"]'),
  ('dua', 'O Turner of hearts, keep my heart firm upon Your religion.', 'Tirmidhi', '["heart", "faith", "steadfastness"]');
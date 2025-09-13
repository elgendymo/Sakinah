-- Seed content snippets with Islamic wisdom

-- Ayat for Envy
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And do not wish for that by which Allah has made some of you exceed others. For men is a share of what they have earned, and for women is a share of what they have earned. And ask Allah of His bounty.', 'Surah An-Nisa 4:32', ARRAY['envy', 'contentment', 'gratitude']),
  ('ayah', 'Or do they envy people for what Allah has given them of His bounty?', 'Surah An-Nisa 4:54', ARRAY['envy', 'hasad']);

-- Hadith for Envy
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'Beware of envy, for envy consumes good deeds just as fire consumes wood.', 'Sunan Abu Dawud', ARRAY['envy', 'hasad']),
  ('hadith', 'None of you truly believes until he loves for his brother what he loves for himself.', 'Bukhari & Muslim', ARRAY['envy', 'brotherhood', 'love']);

-- Duas for Envy
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('dua', 'O Allah, I seek refuge in You from the evil of the envious when he envies.', 'Surah Al-Falaq', ARRAY['envy', 'protection']),
  ('dua', 'O Allah, purify my heart from envy and fill it with contentment.', 'General Dua', ARRAY['envy', 'contentment', 'purification']);

-- Ayat for Anger
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And those who restrain anger and pardon people - and Allah loves those who do good.', 'Surah Ali Imran 3:134', ARRAY['anger', 'forgiveness', 'patience']),
  ('ayah', 'The servants of the Most Merciful are those who walk upon the earth humbly, and when the ignorant address them, they say words of peace.', 'Surah Al-Furqan 25:63', ARRAY['anger', 'patience', 'peace']);

-- Hadith for Anger
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'The strong is not the one who overcomes people by his strength, but the one who controls himself while in anger.', 'Bukhari', ARRAY['anger', 'self-control', 'strength']),
  ('hadith', 'If one of you becomes angry, let him remain silent.', 'Ahmad', ARRAY['anger', 'silence', 'control']);

-- Ayat for Pride
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And do not turn your face away from people in arrogance, nor walk upon the earth exultantly. Indeed, Allah does not like everyone self-deluded and boastful.', 'Surah Luqman 31:18', ARRAY['pride', 'humility', 'arrogance']),
  ('ayah', 'Indeed, He does not like the arrogant.', 'Surah An-Nahl 16:23', ARRAY['pride', 'arrogance']);

-- Hadith for Pride
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'No one who has an atoms weight of pride in his heart will enter Paradise.', 'Muslim', ARRAY['pride', 'humility', 'paradise']),
  ('hadith', 'Allah is Beautiful and loves beauty. Pride means denying the truth and looking down on people.', 'Muslim', ARRAY['pride', 'beauty', 'truth']);

-- Ayat for Patience
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.', 'Surah Al-Baqarah 2:153', ARRAY['patience', 'sabr', 'prayer']),
  ('ayah', 'And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings to the patient.', 'Surah Al-Baqarah 2:155', ARRAY['patience', 'test', 'trials']);

-- Hadith for Patience
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'Amazing is the affair of the believer, for all his affairs are good, and this is not for anyone except the believer.', 'Muslim', ARRAY['patience', 'gratitude', 'contentment']),
  ('hadith', 'Whoever remains patient, Allah will make him patient. Nobody can be given a blessing better and greater than patience.', 'Bukhari', ARRAY['patience', 'blessing', 'sabr']);

-- Ayat for Gratitude
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'If you are grateful, I will surely increase you in favor.', 'Surah Ibrahim 14:7', ARRAY['gratitude', 'shukr', 'increase']),
  ('ayah', 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.', 'Surah Al-Baqarah 2:152', ARRAY['gratitude', 'remembrance', 'dhikr']);

-- Hadith for Gratitude
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'He who does not thank people, does not thank Allah.', 'Ahmad', ARRAY['gratitude', 'thankfulness', 'people']),
  ('hadith', 'Look at those below you and do not look at those above you, for it is more suitable that you should not consider Allahs favor as insignificant.', 'Muslim', ARRAY['gratitude', 'contentment', 'comparison']);

-- Ayat for Tawakkul
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'And whoever relies upon Allah - then He is sufficient for him.', 'Surah At-Talaq 65:3', ARRAY['tawakkul', 'trust', 'reliance']),
  ('ayah', 'And upon Allah let the believers rely.', 'Surah Ali Imran 3:160', ARRAY['tawakkul', 'trust', 'faith']);

-- Hadith for Tawakkul
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('hadith', 'If you were to rely upon Allah with true reliance, He would provide for you as He provides for the birds.', 'Tirmidhi', ARRAY['tawakkul', 'provision', 'trust']),
  ('hadith', 'Tie your camel and put your trust in Allah.', 'Tirmidhi', ARRAY['tawakkul', 'effort', 'trust']);

-- Ayat for Lust/Chastity
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('ayah', 'Tell the believing men to lower their gaze and guard their private parts. That is purer for them.', 'Surah An-Nur 24:30', ARRAY['lust', 'chastity', 'gaze', 'modesty']),
  ('ayah', 'And do not approach unlawful sexual intercourse. Indeed, it is ever an immorality and is evil as a way.', 'Surah Al-Isra 17:32', ARRAY['lust', 'chastity', 'zina']);

-- Notes/Wisdom
INSERT INTO content_snippets (type, text, ref, tags) VALUES
  ('note', 'The heart is like a bird: love is its head, and fear and hope are its wings. When the head and wings are sound, the bird flies gracefully.', 'Ibn Qayyim', ARRAY['heart', 'balance', 'spiritual']),
  ('note', 'Sin is a moment of pleasure followed by long regret, while obedience is a moment of struggle followed by long happiness.', 'Islamic Wisdom', ARRAY['sin', 'obedience', 'wisdom']);
-- Add multilingual support for Arabic and English content
-- Migration: 003_multilingual_support

-- Add locale columns to existing tables
ALTER TABLE profiles ADD COLUMN preferred_locale TEXT DEFAULT 'en' CHECK (preferred_locale IN ('en', 'ar'));
ALTER TABLE profiles ADD COLUMN preferred_font TEXT DEFAULT 'default';

-- Create multilingual content table for translatable content
CREATE TABLE content_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_snippets(id) ON DELETE CASCADE NOT NULL,
  locale TEXT CHECK (locale IN ('en', 'ar')) NOT NULL,
  title TEXT,
  text TEXT NOT NULL,
  ref TEXT,
  transliteration TEXT, -- For Arabic content romanization
  pronunciation_guide TEXT, -- Pronunciation help for Arabic terms
  context_notes TEXT, -- Cultural/religious context for translation
  translator_notes TEXT, -- Translator's notes
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(content_id, locale)
);

-- Create function to get content in preferred language with fallback
CREATE OR REPLACE FUNCTION get_localized_content(
  content_uuid UUID,
  user_locale TEXT DEFAULT 'en'
) RETURNS TABLE (
  id UUID,
  type TEXT,
  text TEXT,
  ref TEXT,
  tags TEXT[],
  transliteration TEXT,
  pronunciation_guide TEXT,
  context_notes TEXT,
  locale TEXT
) AS $$
BEGIN
  -- Try to get content in requested locale first
  RETURN QUERY
  SELECT
    cs.id,
    cs.type,
    COALESCE(ct.text, cs.text) as text,
    COALESCE(ct.ref, cs.ref) as ref,
    cs.tags,
    ct.transliteration,
    ct.pronunciation_guide,
    ct.context_notes,
    COALESCE(ct.locale, 'en') as locale
  FROM content_snippets cs
  LEFT JOIN content_translations ct ON cs.id = ct.content_id AND ct.locale = user_locale
  WHERE cs.id = content_uuid;

  -- If no result found in requested locale, fallback to English
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      cs.id,
      cs.type,
      cs.text,
      cs.ref,
      cs.tags,
      NULL::TEXT as transliteration,
      NULL::TEXT as pronunciation_guide,
      NULL::TEXT as context_notes,
      'en'::TEXT as locale
    FROM content_snippets cs
    WHERE cs.id = content_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX idx_content_translations_content_locale ON content_translations(content_id, locale);
CREATE INDEX idx_profiles_locale ON profiles(preferred_locale);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content_translations
CREATE TRIGGER update_content_translations_updated_at
  BEFORE UPDATE ON content_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add user preference tracking for RTL/LTR
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'ar')),
  font_preference TEXT DEFAULT 'system',
  theme_preference TEXT DEFAULT 'auto' CHECK (theme_preference IN ('light', 'dark', 'auto')),
  prayer_calculation_method TEXT DEFAULT 'MuslimWorldLeague',
  notification_settings JSONB DEFAULT '{"prayers": true, "habits": true, "reminders": true}',
  privacy_settings JSONB DEFAULT '{"profile_visibility": "private", "habit_sharing": false}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for multilingual content
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Public read access to content translations
CREATE POLICY content_translations_public_read ON content_translations
  FOR SELECT USING (true);

-- Users can only read/update their own preferences
CREATE POLICY user_preferences_own_data ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON content_translations TO anon, authenticated;
GRANT ALL ON user_preferences TO authenticated;

-- Create helper function to initialize user preferences with locale detection
CREATE OR REPLACE FUNCTION initialize_user_preferences(
  user_uuid UUID,
  detected_locale TEXT DEFAULT 'en'
) RETURNS void AS $$
BEGIN
  INSERT INTO user_preferences (user_id, locale)
  VALUES (user_uuid, detected_locale)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE content_translations IS 'Stores localized versions of content snippets for multilingual support';
COMMENT ON TABLE user_preferences IS 'Stores user preferences including locale, font, theme, and notification settings';
COMMENT ON FUNCTION get_localized_content IS 'Returns content in requested locale with fallback to English if translation not available';
COMMENT ON FUNCTION initialize_user_preferences IS 'Initializes user preferences with detected locale from browser/system';

-- Add some sample Arabic translations for Islamic content
-- Note: In production, these would be added through a proper content management system
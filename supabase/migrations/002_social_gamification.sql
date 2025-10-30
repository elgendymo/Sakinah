-- Add social circles and gamification features

-- Social Circles table
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
  description TEXT CHECK (length(description) <= 500),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  max_members INTEGER NOT NULL CHECK (max_members >= 3 AND max_members <= 7),
  is_anonymous BOOLEAN DEFAULT FALSE,
  shared_goal TEXT CHECK (length(shared_goal) <= 200),
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Circle memberships table
CREATE TABLE circle_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('creator', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(circle_id, user_id)
);

-- Circle encouragements table
CREATE TABLE circle_encouragements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (length(message) >= 1 AND length(message) <= 300),
  type TEXT CHECK (type IN ('dua', 'encouragement', 'reminder')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User stats for gamification
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_khayr_points INTEGER DEFAULT 0 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  habits_completed INTEGER DEFAULT 0 NOT NULL,
  plans_completed INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  achievements TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Achievements reference table (static data)
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT CHECK (condition_type IN ('streak', 'habits_completed', 'plans_completed', 'consistency')) NOT NULL,
  condition_target INTEGER NOT NULL,
  khayr_reward INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_circles_creator ON circles(creator_id);
CREATE INDEX idx_circle_memberships_circle ON circle_memberships(circle_id);
CREATE INDEX idx_circle_memberships_user ON circle_memberships(user_id);
CREATE INDEX idx_circle_encouragements_circle ON circle_encouragements(circle_id);
CREATE INDEX idx_user_stats_level ON user_stats(level DESC);

-- Row Level Security
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_encouragements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Circles
CREATE POLICY "Users can view circles they are members of" ON circles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_memberships
      WHERE circle_memberships.circle_id = circles.id
      AND circle_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create circles" ON circles
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Circle creators can update their circles" ON circles
  FOR UPDATE USING (auth.uid() = creator_id);

-- RLS Policies for Circle Memberships
CREATE POLICY "Users can view memberships of their circles" ON circle_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_memberships cm2
      WHERE cm2.circle_id = circle_memberships.circle_id
      AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join circles" ON circle_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Encouragements
CREATE POLICY "Circle members can view encouragements" ON circle_encouragements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_memberships
      WHERE circle_memberships.circle_id = circle_encouragements.circle_id
      AND circle_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Circle members can create encouragements" ON circle_encouragements
  FOR INSERT WITH CHECK (
    auth.uid() = from_user_id AND
    EXISTS (
      SELECT 1 FROM circle_memberships
      WHERE circle_memberships.circle_id = circle_encouragements.circle_id
      AND circle_memberships.user_id = auth.uid()
    )
  );

-- RLS Policies for User Stats
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR ALL USING (auth.uid() = user_id);

-- Achievements are public read
CREATE POLICY "Achievements are public" ON achievements
  FOR SELECT USING (true);

-- Function to initialize user stats
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create user stats when user is created
CREATE TRIGGER trigger_initialize_user_stats
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_stats();

-- Function to update user stats on habit completion
CREATE OR REPLACE FUNCTION update_user_stats_on_habit_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update habit completion count and khayr points
  UPDATE user_stats
  SET
    habits_completed = habits_completed + 1,
    total_khayr_points = total_khayr_points + 10, -- 10 points per habit
    last_updated = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when habit is completed
CREATE TRIGGER trigger_update_user_stats_habit
  AFTER INSERT ON habit_completions
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_habit_completion();

-- Insert default achievements
INSERT INTO achievements VALUES
  ('first_habit', 'First Step', 'Complete your first habit', '🌱', 'habits_completed', 1, 50),
  ('week_streak', 'Weekly Warrior', 'Maintain a 7-day streak', '🔥', 'streak', 7, 100),
  ('month_streak', 'Steadfast Soul', 'Maintain a 30-day streak', '💪', 'streak', 30, 300),
  ('hundred_habits', 'Habit Master', 'Complete 100 habits', '⭐', 'habits_completed', 100, 500),
  ('first_plan', 'Journey Begins', 'Complete your first tazkiyah plan', '🌿', 'plans_completed', 1, 75),
  ('consistency_king', 'Consistent Spirit', 'Complete habits for 21 consecutive days', '👑', 'consistency', 21, 250);
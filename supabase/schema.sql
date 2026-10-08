-- ============================================================
-- VISIONAI DATABASE SCHEMA FOR SUPABASE POSTGRESQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 2. CONVERSATIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Visual Chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    image_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0
);

-- ------------------------------------------------------------
-- 3. IMAGES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    file_name TEXT,
    mime_type TEXT NOT NULL,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. MESSAGES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    image_id UUID REFERENCES public.images(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. IMAGE_ANALYSIS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.image_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE UNIQUE,
    description TEXT,
    scene TEXT,
    ocr_text TEXT,
    objects JSONB DEFAULT '[]'::jsonb,
    confidence NUMERIC DEFAULT 0.9,
    analysis_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. USAGE_EVENTS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. DATABASE INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_images_conversation_id ON public.images(conversation_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_image_analysis_image_id ON public.image_analysis(image_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON public.usage_events(user_id);

-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Conversations Policies
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Images Policies
CREATE POLICY "Users can view own images" ON public.images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON public.images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.images
    FOR DELETE USING (auth.uid() = user_id);

-- Messages Policies
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON public.messages
    FOR DELETE USING (auth.uid() = user_id);

-- Image Analysis Policies
CREATE POLICY "Users can view own image analysis" ON public.image_analysis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.images
            WHERE images.id = image_analysis.image_id
            AND images.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own image analysis" ON public.image_analysis
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.images
            WHERE images.id = image_analysis.image_id
            AND images.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own image analysis" ON public.image_analysis
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.images
            WHERE images.id = image_analysis.image_id
            AND images.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own image analysis" ON public.image_analysis
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.images
            WHERE images.id = image_analysis.image_id
            AND images.user_id = auth.uid()
        )
    );

-- Usage Events Policies
CREATE POLICY "Users can view own usage events" ON public.usage_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage events" ON public.usage_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 9. STORAGE BUCKET SETUP (Execute in Supabase SQL editor)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('vision-images', 'vision-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Users can view own vision images" ON storage.objects
    FOR SELECT USING (bucket_id = 'vision-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own vision images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'vision-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own vision images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'vision-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own vision images" ON storage.objects
    FOR DELETE USING (bucket_id = 'vision-images' AND auth.uid()::text = (storage.foldername(name))[1]);

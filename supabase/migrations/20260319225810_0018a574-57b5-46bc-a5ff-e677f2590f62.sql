
-- =============================================
-- SALES CONFIG TABLES - Phase 1A
-- =============================================

-- 1. sales_pipeline_stages
CREATE TABLE public.sales_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_name TEXT NOT NULL,
  stage_code TEXT,
  stage_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. sales_lead_sources
CREATE TABLE public.sales_lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. sales_segments
CREATE TABLE public.sales_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_name TEXT NOT NULL,
  segment_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. sales_loss_reasons
CREATE TABLE public.sales_loss_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reason_name TEXT NOT NULL,
  reason_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.sales_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_loss_reasons ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users can read active config
CREATE POLICY "Authenticated users can read pipeline stages"
  ON public.sales_pipeline_stages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read lead sources"
  ON public.sales_lead_sources FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read segments"
  ON public.sales_segments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read loss reasons"
  ON public.sales_loss_reasons FOR SELECT TO authenticated
  USING (true);

-- Write: only authenticated users can insert/update/delete (admin enforcement in app layer for now)
CREATE POLICY "Authenticated users can insert pipeline stages"
  ON public.sales_pipeline_stages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pipeline stages"
  ON public.sales_pipeline_stages FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert lead sources"
  ON public.sales_lead_sources FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lead sources"
  ON public.sales_lead_sources FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert segments"
  ON public.sales_segments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update segments"
  ON public.sales_segments FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert loss reasons"
  ON public.sales_loss_reasons FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update loss reasons"
  ON public.sales_loss_reasons FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

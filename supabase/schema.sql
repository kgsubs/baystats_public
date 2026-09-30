-- Public schema of the live BayStats database, dumped 2026-09-30 with pg_dump --schema-only.
-- No data. Apply to a new Supabase project to stand up the tables, functions, policies and grants.
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: add_admin_by_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_admin_by_email(admin_email text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  target_user_id UUID;
  result JSONB;
BEGIN
  -- Look up user_id from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = admin_email
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found. They must register first.',
      'email', admin_email
    );
  END IF;
  
  -- Insert or update admin record
  INSERT INTO admin_users (user_id, email, password_hash)
  VALUES (target_user_id, admin_email, 'supabase_auth')
  ON CONFLICT (user_id) DO UPDATE 
  SET email = admin_email
  RETURNING jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'email', email
  ) INTO result;
  
  RETURN result;
END;
$$;


--
-- Name: format_office_hours_schedule(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.format_office_hours_schedule(hours_structured jsonb) RETURNS TABLE(line1 text, line2 text, line3 text)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  mon_fri_open TEXT;
  mon_fri_close TEXT;
  sat_open TEXT;
  sat_close TEXT;
  sun_open TEXT;
  sun_close TEXT;
  has_sat BOOLEAN;
  has_sun BOOLEAN;
  sat_same_as_sun BOOLEAN;
BEGIN
  -- Extract values
  mon_fri_open := hours_structured->'mon_fri'->>'open';
  mon_fri_close := hours_structured->'mon_fri'->>'close';
  sat_open := hours_structured->'sat'->>'open';
  sat_close := hours_structured->'sat'->>'close';
  sun_open := hours_structured->'sun'->>'open';
  sun_close := hours_structured->'sun'->>'close';
  
  has_sat := sat_open IS NOT NULL AND sat_close IS NOT NULL;
  has_sun := sun_open IS NOT NULL AND sun_close IS NOT NULL;
  sat_same_as_sun := (sat_open = sun_open AND sat_close = sun_close);
  
  -- Line 1: Always Mon-Fri
  line1 := 'Mon-Fri ' || mon_fri_open || '-' || mon_fri_close;
  
  -- Lines 2 & 3: Weekend logic
  line2 := NULL;
  line3 := NULL;
  
  IF has_sat AND has_sun THEN
    -- Both weekend days set
    IF sat_same_as_sun THEN
      -- Same hours - combine
      line2 := 'Sat+Sun ' || sat_open || '-' || sat_close;
    ELSE
      -- Different hours - separate lines
      line2 := 'Sat ' || sat_open || '-' || sat_close;
      line3 := 'Sun ' || sun_open || '-' || sun_close;
    END IF;
  ELSIF has_sat THEN
    -- Only Saturday
    line2 := 'Sat ' || sat_open || '-' || sat_close;
  ELSIF has_sun THEN
    -- Only Sunday
    line2 := 'Sun ' || sun_open || '-' || sun_close;
  END IF;
  
  RETURN NEXT;
END;
$$;


--
-- Name: get_marina_clearance_info(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_marina_clearance_info(marina_slug text) RETURNS TABLE(customs_hours text, immigration_hours text, clearance_notes text, customs_is_manual boolean, immigration_is_manual boolean)
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN mp.manual_overrides->>'customs_hours' IS NOT NULL 
      THEN mp.manual_overrides->>'customs_hours'
      ELSE mp.customs_hours
    END,
    CASE 
      WHEN mp.manual_overrides->>'immigration_hours' IS NOT NULL 
      THEN mp.manual_overrides->>'immigration_hours'
      ELSE mp.immigration_hours
    END,
    mp.clearance_notes,
    (mp.manual_overrides->>'customs_hours') IS NOT NULL,
    (mp.manual_overrides->>'immigration_hours') IS NOT NULL
  FROM marina_profiles mp
  WHERE mp.slug = marina_slug
  AND mp.status IN ('approved', 'manual_only');
END;
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(check_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = check_user_id
  );
END;
$$;


--
-- Name: update_marina_profiles_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_marina_profiles_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    password_hash text NOT NULL,
    user_id uuid
);


--
-- Name: clearance_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clearance_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customs_hours text NOT NULL,
    immigration_hours text NOT NULL,
    fees jsonb NOT NULL,
    last_updated timestamp without time zone NOT NULL,
    marina jsonb,
    notes text
);


--
-- Name: location_waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    location_slug text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: magic_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone
);


--
-- Name: marina_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marina_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    location text NOT NULL,
    country text DEFAULT 'St. Lucia'::text NOT NULL,
    address text,
    phone text,
    website text,
    website_label text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    boat_size_capacity text,
    total_berths integer,
    mooring_ball_availability text,
    restrooms_showers text,
    water_depth text,
    fuel_dock text,
    water_availability text,
    power_connections text,
    maintenance_repair text,
    chandlery text,
    wifi text,
    amenities jsonb DEFAULT '[]'::jsonb,
    marinelink_url text,
    marinelink_raw_content text,
    last_scraped_at timestamp without time zone,
    status text DEFAULT 'pending_review'::text NOT NULL,
    scraped_data jsonb,
    manual_overrides jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    reserve_berth_url text,
    customs_hours text,
    immigration_hours text,
    clearance_notes text,
    office_hours_scraped_at timestamp without time zone,
    office_hours_manual_at timestamp without time zone,
    customs_hours_structured jsonb,
    immigration_hours_structured jsonb,
    additional_services jsonb DEFAULT '{}'::jsonb,
    vhf_channel text,
    services jsonb DEFAULT '[]'::jsonb,
    total_slips integer,
    total_moorings integer
);


--
-- Name: COLUMN marina_profiles.additional_services; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marina_profiles.additional_services IS 'Flexible storage for additional marina services such as: ferry_terminal, diving_services, boat_yard, dry_storage, haul_out_facilities, laundry, provisioning, customs_onsite, waste_disposal, atm_banking, medical_facilities, car_rental, airport_shuttle, charter_services. Only non-null/non-empty values should be displayed on frontend.';


--
-- Name: COLUMN marina_profiles.vhf_channel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marina_profiles.vhf_channel IS 'VHF radio channel for marina communication (e.g., "9", "16", "Ch 9")';


--
-- Name: COLUMN marina_profiles.services; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marina_profiles.services IS 'Structured service data with enabled/disabled state. Format: [{"id": "power_110v", "name": "110V", "emoji": "⚡", "category": "power", "enabled": true}, ...]';


--
-- Name: marina_office_hours; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.marina_office_hours WITH (security_invoker='true') AS
 SELECT id,
    name,
    slug,
        CASE
            WHEN ((manual_overrides ->> 'customs_hours'::text) IS NOT NULL) THEN (manual_overrides ->> 'customs_hours'::text)
            ELSE customs_hours
        END AS customs_hours,
        CASE
            WHEN ((manual_overrides ->> 'immigration_hours'::text) IS NOT NULL) THEN (manual_overrides ->> 'immigration_hours'::text)
            ELSE immigration_hours
        END AS immigration_hours,
    ((manual_overrides ->> 'customs_hours'::text) IS NOT NULL) AS customs_is_manual,
    ((manual_overrides ->> 'immigration_hours'::text) IS NOT NULL) AS immigration_is_manual,
        CASE
            WHEN ((manual_overrides ->> 'customs_hours'::text) IS NOT NULL) THEN 'manual'::text
            WHEN (customs_hours IS NOT NULL) THEN 'scraped'::text
            ELSE 'default'::text
        END AS customs_source,
        CASE
            WHEN ((manual_overrides ->> 'immigration_hours'::text) IS NOT NULL) THEN 'manual'::text
            WHEN (immigration_hours IS NOT NULL) THEN 'scraped'::text
            ELSE 'default'::text
        END AS immigration_source,
    office_hours_scraped_at,
    office_hours_manual_at
   FROM public.marina_profiles
  WHERE (status = ANY (ARRAY['approved'::text, 'manual_only'::text]));


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_start timestamp without time zone NOT NULL,
    session_end timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    access_token uuid,
    refresh_token uuid,
    checkout_token text
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ls_subscription_id character varying(255),
    ls_customer_id character varying(255) NOT NULL,
    ls_customer_portal_url text,
    plan_tier character varying(50) DEFAULT 'monthly'::character varying NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    current_period_end timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text,
    tier text DEFAULT 'free'::text,
    ls_customer_id text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT users_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'pro'::text])))
);


--
-- Name: vessel_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vessel_counts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    count integer NOT NULL,
    recorded_at timestamp without time zone NOT NULL,
    time_of_day text,
    notes text,
    reporter text DEFAULT 'System'::text NOT NULL,
    source text DEFAULT 'MANUAL_ENTRY'::text,
    created_at timestamp without time zone DEFAULT now(),
    location text DEFAULT 'rodney-bay'::text,
    CONSTRAINT vessel_counts_time_of_day_check CHECK ((time_of_day = ANY (ARRAY['morning'::text, 'evening'::text])))
);


--
-- Name: weather_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weather_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data jsonb NOT NULL,
    cached_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: wind_field_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wind_field_cache (
    location_slug text NOT NULL,
    payload jsonb NOT NULL,
    observed_at timestamp with time zone NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_unique UNIQUE (user_id);


--
-- Name: clearance_info clearance_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearance_info
    ADD CONSTRAINT clearance_info_pkey PRIMARY KEY (id);


--
-- Name: location_waitlist location_waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_waitlist
    ADD CONSTRAINT location_waitlist_pkey PRIMARY KEY (id);


--
-- Name: magic_tokens magic_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_pkey PRIMARY KEY (id);


--
-- Name: magic_tokens magic_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_token_key UNIQUE (token);


--
-- Name: marina_profiles marina_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marina_profiles
    ADD CONSTRAINT marina_profiles_pkey PRIMARY KEY (id);


--
-- Name: marina_profiles marina_profiles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marina_profiles
    ADD CONSTRAINT marina_profiles_slug_key UNIQUE (slug);


--
-- Name: sessions sessions_access_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_access_token_key UNIQUE (access_token);


--
-- Name: sessions sessions_checkout_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_checkout_token_key UNIQUE (checkout_token);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_refresh_token_key UNIQUE (refresh_token);


--
-- Name: subscriptions subscriptions_ls_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_ls_subscription_id_key UNIQUE (ls_subscription_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vessel_counts vessel_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vessel_counts
    ADD CONSTRAINT vessel_counts_pkey PRIMARY KEY (id);


--
-- Name: weather_cache weather_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_cache
    ADD CONSTRAINT weather_cache_pkey PRIMARY KEY (id);


--
-- Name: wind_field_cache wind_field_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wind_field_cache
    ADD CONSTRAINT wind_field_cache_pkey PRIMARY KEY (location_slug);


--
-- Name: idx_marina_profiles_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marina_profiles_location ON public.marina_profiles USING btree (location);


--
-- Name: idx_marina_profiles_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marina_profiles_slug ON public.marina_profiles USING btree (slug);


--
-- Name: idx_marina_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marina_profiles_status ON public.marina_profiles USING btree (status);


--
-- Name: idx_sessions_access_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_access_token ON public.sessions USING btree (access_token);


--
-- Name: idx_sessions_refresh_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_refresh_token ON public.sessions USING btree (refresh_token);


--
-- Name: idx_sessions_user_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_dates ON public.sessions USING btree (user_id, session_start, session_end);


--
-- Name: idx_subscriptions_ls_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_ls_customer ON public.subscriptions USING btree (ls_customer_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_vessel_counts_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vessel_counts_location ON public.vessel_counts USING btree (location);


--
-- Name: idx_vessel_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vessel_recorded ON public.vessel_counts USING btree (recorded_at DESC);


--
-- Name: idx_vessel_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vessel_reporter ON public.vessel_counts USING btree (reporter);


--
-- Name: idx_vessel_time_of_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vessel_time_of_day ON public.vessel_counts USING btree (time_of_day);


--
-- Name: idx_weather_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weather_expires ON public.weather_cache USING btree (expires_at);


--
-- Name: location_waitlist_email_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX location_waitlist_email_location_idx ON public.location_waitlist USING btree (lower(email), location_slug);


--
-- Name: marina_profiles update_marina_profiles_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_marina_profiles_timestamp BEFORE UPDATE ON public.marina_profiles FOR EACH ROW EXECUTE FUNCTION public.update_marina_profiles_updated_at();


--
-- Name: admin_users admin_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: magic_tokens magic_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: marina_profiles marina_profiles_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marina_profiles
    ADD CONSTRAINT marina_profiles_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: clearance_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clearance_info ENABLE ROW LEVEL SECURITY;

--
-- Name: clearance_info clearance_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clearance_public_read ON public.clearance_info FOR SELECT USING (true);


--
-- Name: location_waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.location_waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: marina_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marina_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: marina_profiles marina_profiles_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY marina_profiles_admin_all ON public.marina_profiles USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- Name: marina_profiles marina_profiles_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY marina_profiles_public_read ON public.marina_profiles FOR SELECT USING (((status = 'approved'::text) OR (status = 'manual_only'::text)));


--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions sessions_own_data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_own_data ON public.sessions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_own_data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_own_data ON public.users USING ((auth.uid() = id));


--
-- Name: vessel_counts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vessel_counts ENABLE ROW LEVEL SECURITY;

--
-- Name: vessel_counts vessels_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vessels_public_read ON public.vessel_counts FOR SELECT USING (true);


--
-- Name: weather_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: weather_cache weather_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY weather_public_read ON public.weather_cache FOR SELECT USING (true);


--
-- Name: wind_field_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wind_field_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: wind_field_cache wind_field_cache_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wind_field_cache_public_read ON public.wind_field_cache FOR SELECT USING (true);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION add_admin_by_email(admin_email text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.add_admin_by_email(admin_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.add_admin_by_email(admin_email text) TO service_role;


--
-- Name: FUNCTION format_office_hours_schedule(hours_structured jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.format_office_hours_schedule(hours_structured jsonb) TO anon;
GRANT ALL ON FUNCTION public.format_office_hours_schedule(hours_structured jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.format_office_hours_schedule(hours_structured jsonb) TO service_role;


--
-- Name: FUNCTION get_marina_clearance_info(marina_slug text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_marina_clearance_info(marina_slug text) TO anon;
GRANT ALL ON FUNCTION public.get_marina_clearance_info(marina_slug text) TO authenticated;
GRANT ALL ON FUNCTION public.get_marina_clearance_info(marina_slug text) TO service_role;


--
-- Name: FUNCTION is_admin(check_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_admin(check_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_admin(check_user_id uuid) TO service_role;


--
-- Name: FUNCTION update_marina_profiles_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_marina_profiles_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_marina_profiles_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_marina_profiles_updated_at() TO service_role;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_users TO service_role;


--
-- Name: TABLE clearance_info; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clearance_info TO anon;
GRANT ALL ON TABLE public.clearance_info TO authenticated;
GRANT ALL ON TABLE public.clearance_info TO service_role;


--
-- Name: TABLE location_waitlist; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.location_waitlist TO anon;
GRANT ALL ON TABLE public.location_waitlist TO authenticated;
GRANT ALL ON TABLE public.location_waitlist TO service_role;


--
-- Name: TABLE magic_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.magic_tokens TO service_role;


--
-- Name: TABLE marina_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marina_profiles TO anon;
GRANT ALL ON TABLE public.marina_profiles TO authenticated;
GRANT ALL ON TABLE public.marina_profiles TO service_role;


--
-- Name: TABLE marina_office_hours; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marina_office_hours TO anon;
GRANT ALL ON TABLE public.marina_office_hours TO authenticated;
GRANT ALL ON TABLE public.marina_office_hours TO service_role;


--
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sessions TO anon;
GRANT ALL ON TABLE public.sessions TO authenticated;
GRANT ALL ON TABLE public.sessions TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: TABLE vessel_counts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vessel_counts TO anon;
GRANT ALL ON TABLE public.vessel_counts TO authenticated;
GRANT ALL ON TABLE public.vessel_counts TO service_role;


--
-- Name: TABLE weather_cache; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.weather_cache TO anon;
GRANT ALL ON TABLE public.weather_cache TO authenticated;
GRANT ALL ON TABLE public.weather_cache TO service_role;


--
-- Name: TABLE wind_field_cache; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.wind_field_cache TO anon;
GRANT ALL ON TABLE public.wind_field_cache TO authenticated;
GRANT ALL ON TABLE public.wind_field_cache TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--



-- Explicit revokes for SECURITY DEFINER functions. Supabase's default
-- privileges grant EXECUTE on new functions to anon and authenticated at
-- creation time; REVOKE ... FROM PUBLIC above does not touch those
-- role-specific grants, so anon/authenticated must be revoked by name.
REVOKE EXECUTE ON FUNCTION public.add_admin_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;

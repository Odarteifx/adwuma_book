-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'salon','barber','nail_tech','lash_tech','makeup_artist',
    'photographer','decorator','clinic','tutor','restaurant',
    'event_vendor','other'
  )),
  whatsapp_number TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  logo_url TEXT,
  banner_url TEXT,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','business','pro')),
  plan_expires_at TIMESTAMPTZ,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes >= 10 AND slot_interval_minutes <= 120),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_businesses_slug ON businesses(slug);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 15 AND duration_minutes <= 480),
  deposit_type TEXT NOT NULL DEFAULT 'percentage' CHECK (deposit_type IN ('fixed','percentage')),
  deposit_value DECIMAL(10,2) NOT NULL CHECK (deposit_value > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_business ON services(business_id);

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, day_of_week),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_business ON availability(business_id);

CREATE TABLE availability_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID REFERENCES availability(id) ON DELETE CASCADE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, date)
);

CREATE INDEX idx_blocked_dates_business ON blocked_dates(business_id, date);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_deposit' CHECK (status IN (
    'pending_deposit','confirmed','completed','cancelled','no_show','expired'
  )),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  deposit_amount DECIMAL(10,2) NOT NULL CHECK (deposit_amount >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  notes TEXT,
  reservation_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_bookings_business ON bookings(business_id, booking_date);
CREATE INDEX idx_bookings_status ON bookings(business_id, status);

-- Prevent double-booking: no two active bookings at the same slot
CREATE UNIQUE INDEX idx_unique_active_slot
  ON bookings (business_id, booking_date, start_time)
  WHERE status IN ('pending_deposit', 'confirmed');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  business_id UUID REFERENCES businesses(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  paystack_reference TEXT UNIQUE NOT NULL,
  paystack_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  payment_type TEXT NOT NULL DEFAULT 'deposit' CHECK (payment_type IN ('deposit','full')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_business ON payments(business_id);

CREATE TABLE kb_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'faq' CHECK (doc_type IN ('faq','policy','info')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_docs_business ON kb_docs(business_id);

CREATE TABLE kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID REFERENCES kb_docs(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_chunks_business ON kb_chunks(business_id);
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view','booking_created','deposit_paid','booking_confirmed',
    'booking_cancelled','booking_completed','ai_chat_started','ai_chat_to_booking'
  )),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_business_type ON analytics_events(business_id, event_type, created_at);

CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_logs_source ON webhook_logs(source, created_at);

CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  led_to_booking BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_business ON ai_conversations(business_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_kb_docs_updated_at BEFORE UPDATE ON kb_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RPC: Confirm booking with slot lock
-- ============================================================

CREATE OR REPLACE FUNCTION confirm_booking_if_available(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking RECORD;
  v_conflict_count INTEGER;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_booking.status != 'pending_deposit' THEN
    RETURN false;
  END IF;

  -- Check for time overlap with other confirmed bookings
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE business_id = v_booking.business_id
    AND booking_date = v_booking.booking_date
    AND id != p_booking_id
    AND status IN ('confirmed')
    AND start_time < v_booking.end_time
    AND end_time > v_booking.start_time;

  IF v_conflict_count > 0 THEN
    RETURN false;
  END IF;

  UPDATE bookings
  SET status = 'confirmed',
      payment_status = 'paid',
      reservation_expires_at = NULL
  WHERE id = p_booking_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Expire stale reservations
-- ============================================================

CREATE OR REPLACE FUNCTION expire_stale_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE bookings
  SET status = 'expired'
  WHERE status = 'pending_deposit'
    AND reservation_expires_at IS NOT NULL
    AND reservation_expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- BUSINESSES
CREATE POLICY "Owner full access" ON businesses
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Public read active businesses" ON businesses
  FOR SELECT USING (is_active = true);

-- SERVICES
CREATE POLICY "Owner full access" ON services
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  ) WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public read active services" ON services
  FOR SELECT USING (
    is_active = true AND
    business_id IN (SELECT id FROM businesses WHERE is_active = true)
  );

-- AVAILABILITY
CREATE POLICY "Owner full access" ON availability
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  ) WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public read active availability" ON availability
  FOR SELECT USING (
    is_active = true AND
    business_id IN (SELECT id FROM businesses WHERE is_active = true)
  );

-- AVAILABILITY BREAKS
CREATE POLICY "Owner full access" ON availability_breaks
  FOR ALL USING (
    availability_id IN (
      SELECT a.id FROM availability a
      JOIN businesses b ON b.id = a.business_id
      WHERE b.owner_id = auth.uid()
    )
  ) WITH CHECK (
    availability_id IN (
      SELECT a.id FROM availability a
      JOIN businesses b ON b.id = a.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Public read breaks" ON availability_breaks
  FOR SELECT USING (
    availability_id IN (
      SELECT a.id FROM availability a
      JOIN businesses b ON b.id = a.business_id
      WHERE b.is_active = true AND a.is_active = true
    )
  );

-- BLOCKED DATES
CREATE POLICY "Owner full access" ON blocked_dates
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  ) WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public read blocked dates" ON blocked_dates
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE is_active = true)
  );

-- BOOKINGS
CREATE POLICY "Owner read and update" ON bookings
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  ) WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public create booking" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read own booking" ON bookings
  FOR SELECT USING (true);

-- PAYMENTS (service role handles inserts via admin client)
CREATE POLICY "Owner read payments" ON payments
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Service role manage payments" ON payments
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- KB DOCS
CREATE POLICY "Owner full access" ON kb_docs
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  ) WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public read active KB docs" ON kb_docs
  FOR SELECT USING (is_active = true);

-- KB CHUNKS
CREATE POLICY "Owner full access" ON kb_chunks
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  ) WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public read KB chunks" ON kb_chunks
  FOR SELECT USING (true);

-- ANALYTICS EVENTS
CREATE POLICY "Owner read events" ON analytics_events
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Service role manage events" ON analytics_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Public insert events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- WEBHOOK LOGS (service role only)
CREATE POLICY "Service role only" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- AI CONVERSATIONS
CREATE POLICY "Owner read conversations" ON ai_conversations
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public insert and update conversations" ON ai_conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update own conversation" ON ai_conversations
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'business-assets' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Public read assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-assets');

CREATE POLICY "Owner update assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'business-assets' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Owner delete assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'business-assets' AND auth.role() = 'authenticated'
  );

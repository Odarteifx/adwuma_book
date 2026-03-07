-- Reviews table for customer feedback
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_business ON reviews(business_id);
CREATE INDEX idx_reviews_business_created ON reviews(business_id, created_at DESC);
CREATE INDEX idx_reviews_booking ON reviews(booking_id);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Business owners can read their reviews
CREATE POLICY "Owner read reviews" ON reviews
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Anyone can insert a review (customers)
CREATE POLICY "Public insert reviews" ON reviews
  FOR INSERT WITH CHECK (true);

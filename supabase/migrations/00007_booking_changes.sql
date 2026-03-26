-- Record when a booking's date/time is changed (reschedule)
CREATE TABLE booking_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  old_booking_date DATE NOT NULL,
  old_start_time TIME NOT NULL,
  old_end_time TIME NOT NULL,
  new_booking_date DATE NOT NULL,
  new_start_time TIME NOT NULL,
  new_end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_changes_booking ON booking_changes(booking_id);
CREATE INDEX idx_booking_changes_business ON booking_changes(business_id, created_at);

ALTER TABLE booking_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read own business changes" ON booking_changes
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Service role manage changes" ON booking_changes
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

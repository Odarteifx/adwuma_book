ALTER TABLE businesses
  ADD COLUMN max_bookings_per_slot INTEGER NOT NULL DEFAULT 1
  CHECK (max_bookings_per_slot >= 1 AND max_bookings_per_slot <= 100);

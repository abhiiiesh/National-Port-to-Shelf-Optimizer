-- Initial database schema for Port-to-Shelf Optimizer
-- This migration creates all tables, indexes, and constraints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vessels table
CREATE TABLE vessels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  imo_number VARCHAR(20) UNIQUE NOT NULL,
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  current_speed DECIMAL(5, 2),
  current_heading DECIMAL(5, 2),
  status VARCHAR(50) NOT NULL CHECK (status IN ('EN_ROUTE', 'ARRIVED', 'BERTHED', 'DEPARTED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Estimated Arrivals table
CREATE TABLE estimated_arrivals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
  port_id VARCHAR(10) NOT NULL,
  estimated_time TIMESTAMP NOT NULL,
  confidence_interval DECIMAL(5, 2),
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  generated_at TIMESTAMP NOT NULL,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Containers table
CREATE TABLE containers (
  id VARCHAR(20) PRIMARY KEY,
  owner_id UUID NOT NULL,
  current_location_type VARCHAR(50) CHECK (current_location_type IN ('PORT', 'RAIL_TERMINAL', 'WAREHOUSE', 'IN_TRANSIT')),
  current_location_id VARCHAR(10),
  current_mode VARCHAR(50) CHECK (current_mode IN ('VESSEL', 'RAIL', 'TRUCK')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('ON_VESSEL', 'AT_PORT', 'ON_RAIL', 'ON_TRUCK', 'DELIVERED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journey Events table
CREATE TABLE journey_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  container_id VARCHAR(20) REFERENCES containers(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  location_type VARCHAR(50) CHECK (location_type IN ('PORT', 'RAIL_TERMINAL', 'WAREHOUSE', 'IN_TRANSIT')),
  location_id VARCHAR(10),
  transport_mode VARCHAR(50) CHECK (transport_mode IN ('VESSEL', 'RAIL', 'TRUCK')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for journey events by container and timestamp
CREATE INDEX idx_journey_events_container ON journey_events(container_id, timestamp DESC);

-- Demurrage Info table
CREATE TABLE demurrage_info (
  container_id VARCHAR(20) PRIMARY KEY REFERENCES containers(id) ON DELETE CASCADE,
  arrival_at_port TIMESTAMP NOT NULL,
  free_time_hours INTEGER NOT NULL,
  demurrage_start_time TIMESTAMP,
  demurrage_cost DECIMAL(10, 2) DEFAULT 0,
  is_priority BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auctions table
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
  port_id VARCHAR(10) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'CLOSED', 'CANCELLED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Slots table
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  transport_mode VARCHAR(50) NOT NULL CHECK (transport_mode IN ('RAIL', 'TRUCK')),
  origin VARCHAR(10) NOT NULL,
  destination VARCHAR(10) NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  minimum_bid DECIMAL(10, 2) NOT NULL CHECK (minimum_bid >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bids table
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE,
  retailer_id UUID NOT NULL,
  container_id VARCHAR(20) REFERENCES containers(id) ON DELETE CASCADE,
  bid_amount DECIMAL(10, 2) NOT NULL CHECK (bid_amount >= 0),
  timestamp TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'OUTBID')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for bids by auction, slot, and bid amount
CREATE INDEX idx_bids_auction_slot ON bids(auction_id, slot_id, bid_amount DESC);

-- Reservations table
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE,
  container_id VARCHAR(20) REFERENCES containers(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('RESERVED', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  roles VARCHAR(50)[] NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ULIP Events Log table
CREATE TABLE ulip_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  source VARCHAR(255),
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for ULIP events by type and timestamp
CREATE INDEX idx_ulip_events_type_timestamp ON ulip_events(event_type, timestamp DESC);

-- Additional indexes for performance
CREATE INDEX idx_vessels_status ON vessels(status);
CREATE INDEX idx_vessels_imo ON vessels(imo_number);
CREATE INDEX idx_estimated_arrivals_vessel ON estimated_arrivals(vessel_id, is_current);
CREATE INDEX idx_containers_owner ON containers(owner_id);
CREATE INDEX idx_containers_status ON containers(status);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_vessel ON auctions(vessel_id);
CREATE INDEX idx_slots_auction ON slots(auction_id);
CREATE INDEX idx_bids_retailer ON bids(retailer_id);
CREATE INDEX idx_reservations_slot ON reservations(slot_id);
CREATE INDEX idx_reservations_container ON reservations(container_id);
CREATE INDEX idx_ulip_events_processed ON ulip_events(processed, created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_vessels_updated_at BEFORE UPDATE ON vessels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON containers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demurrage_info_updated_at BEFORE UPDATE ON demurrage_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

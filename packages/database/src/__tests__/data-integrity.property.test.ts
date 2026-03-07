/**
 * Property 42: Data Integrity Constraints
 * Feature: port-to-shelf-optimizer, Property 42: Data Integrity Constraints
 * 
 * For any database operation, foreign key constraints, unique constraints, 
 * and check constraints should be enforced to maintain data integrity.
 * 
 * Validates: Requirements 9.3
 */

import * as fc from 'fast-check';
import { query, getPool } from '../pool';
import './setup';

describe('Property 42: Data Integrity Constraints', () => {
  describe('Foreign Key Constraints', () => {
    test('inserting container with non-existent owner should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 4, maxLength: 11 }),
          async (ownerId, containerId) => {
            // Attempt to insert container with non-existent owner
            await expect(
              query(
                `INSERT INTO containers (id, owner_id, status) VALUES ($1, $2, $3)`,
                [containerId, ownerId, 'ON_VESSEL']
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('inserting journey event with non-existent container should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 4, maxLength: 11 }),
          fc.constantFrom('container.loaded', 'container.moved', 'container.delivered'),
          async (containerId, eventType) => {
            await expect(
              query(
                `INSERT INTO journey_events (container_id, timestamp, event_type) VALUES ($1, $2, $3)`,
                [containerId, new Date(), eventType]
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('inserting bid with non-existent auction should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.double({ min: 1000, max: 100000 }),
          async (auctionId, slotId, retailerId, bidAmount) => {
            await expect(
              query(
                `INSERT INTO bids (auction_id, slot_id, retailer_id, bid_amount, timestamp, status) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [auctionId, slotId, retailerId, bidAmount, new Date(), 'SUBMITTED']
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('deleting vessel should cascade delete estimated arrivals', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 7, maxLength: 7, pattern: '[0-9]' }),
          async (vesselName, imoNumber) => {
            // Insert vessel
            const vesselResult = await query(
              `INSERT INTO vessels (name, imo_number, status) VALUES ($1, $2, $3) RETURNING id`,
              [vesselName, imoNumber, 'EN_ROUTE']
            );
            const vesselId = vesselResult.rows[0].id;

            // Insert estimated arrival
            await query(
              `INSERT INTO estimated_arrivals (vessel_id, port_id, estimated_time, generated_at) 
               VALUES ($1, $2, $3, $4)`,
              [vesselId, 'INMUM', new Date(), new Date()]
            );

            // Delete vessel
            await query(`DELETE FROM vessels WHERE id = $1`, [vesselId]);

            // Check that estimated arrival was cascade deleted
            const arrivalResult = await query(
              `SELECT * FROM estimated_arrivals WHERE vessel_id = $1`,
              [vesselId]
            );
            expect(arrivalResult.rows).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Unique Constraints', () => {
    test('inserting duplicate IMO number should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 7, maxLength: 7, pattern: '[0-9]' }),
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          async (imoNumber, name1, name2) => {
            // Insert first vessel
            await query(
              `INSERT INTO vessels (name, imo_number, status) VALUES ($1, $2, $3)`,
              [name1, imoNumber, 'EN_ROUTE']
            );

            // Attempt to insert second vessel with same IMO number
            await expect(
              query(
                `INSERT INTO vessels (name, imo_number, status) VALUES ($1, $2, $3)`,
                [name2, imoNumber, 'EN_ROUTE']
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('inserting duplicate username should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 8, maxLength: 100 }),
          fc.string({ minLength: 8, maxLength: 100 }),
          async (username, password1, password2) => {
            // Insert first user
            await query(
              `INSERT INTO users (username, password_hash, roles) VALUES ($1, $2, $3)`,
              [username, password1, ['RETAILER']]
            );

            // Attempt to insert second user with same username
            await expect(
              query(
                `INSERT INTO users (username, password_hash, roles) VALUES ($1, $2, $3)`,
                [username, password2, ['RETAILER']]
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('inserting duplicate ULIP event ID should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }),
          fc.constantFrom('vessel.arrived', 'container.loaded', 'container.delivered'),
          async (eventId, eventType) => {
            // Insert first event
            await query(
              `INSERT INTO ulip_events (event_id, event_type, timestamp, data) VALUES ($1, $2, $3, $4)`,
              [eventId, eventType, new Date(), JSON.stringify({ test: 'data' })]
            );

            // Attempt to insert second event with same event_id
            await expect(
              query(
                `INSERT INTO ulip_events (event_id, event_type, timestamp, data) VALUES ($1, $2, $3, $4)`,
                [eventId, eventType, new Date(), JSON.stringify({ test: 'data2' })]
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Check Constraints', () => {
    test('inserting vessel with invalid status should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 7, maxLength: 7, pattern: '[0-9]' }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => !['EN_ROUTE', 'ARRIVED', 'BERTHED', 'DEPARTED'].includes(s)
          ),
          async (name, imoNumber, invalidStatus) => {
            await expect(
              query(
                `INSERT INTO vessels (name, imo_number, status) VALUES ($1, $2, $3)`,
                [name, imoNumber, invalidStatus]
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('inserting container with invalid status should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 4, maxLength: 11 }),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => !['ON_VESSEL', 'AT_PORT', 'ON_RAIL', 'ON_TRUCK', 'DELIVERED'].includes(s)
          ),
          async (containerId, ownerId, invalidStatus) => {
            await expect(
              query(
                `INSERT INTO containers (id, owner_id, status) VALUES ($1, $2, $3)`,
                [containerId, ownerId, invalidStatus]
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('inserting slot with negative capacity should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -1000, max: -1 }),
          async (negativeCapacity) => {
            // First create a vessel and auction
            const vesselResult = await query(
              `INSERT INTO vessels (name, imo_number, status) VALUES ($1, $2, $3) RETURNING id`,
              ['Test Vessel', '1234567', 'EN_ROUTE']
            );
            const vesselId = vesselResult.rows[0].id;

            const auctionResult = await query(
              `INSERT INTO auctions (vessel_id, port_id, start_time, end_time, status) 
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [vesselId, 'INMUM', new Date(), new Date(), 'ACTIVE']
            );
            const auctionId = auctionResult.rows[0].id;

            // Attempt to insert slot with negative capacity
            await expect(
              query(
                `INSERT INTO slots (auction_id, transport_mode, origin, destination, departure_time, capacity, minimum_bid) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [auctionId, 'RAIL', 'INMUM', 'INDEL', new Date(), negativeCapacity, 1000]
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('inserting bid with negative amount should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: -100000, max: -0.01 }),
          async (negativeBid) => {
            // Create vessel, auction, and slot
            const vesselResult = await query(
              `INSERT INTO vessels (name, imo_number, status) VALUES ($1, $2, $3) RETURNING id`,
              ['Test Vessel', '1234567', 'EN_ROUTE']
            );
            const vesselId = vesselResult.rows[0].id;

            const auctionResult = await query(
              `INSERT INTO auctions (vessel_id, port_id, start_time, end_time, status) 
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [vesselId, 'INMUM', new Date(), new Date(), 'ACTIVE']
            );
            const auctionId = auctionResult.rows[0].id;

            const slotResult = await query(
              `INSERT INTO slots (auction_id, transport_mode, origin, destination, departure_time, capacity, minimum_bid) 
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
              [auctionId, 'RAIL', 'INMUM', 'INDEL', new Date(), 10, 1000]
            );
            const slotId = slotResult.rows[0].id;

            // Create container
            const containerResult = await query(
              `INSERT INTO containers (id, owner_id, status) VALUES ($1, $2, $3) RETURNING id`,
              ['TEST1234567', '00000000-0000-0000-0000-000000000001', 'AT_PORT']
            );
            const containerId = containerResult.rows[0].id;

            // Attempt to insert bid with negative amount
            await expect(
              query(
                `INSERT INTO bids (auction_id, slot_id, retailer_id, container_id, bid_amount, timestamp, status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [auctionId, slotId, '00000000-0000-0000-0000-000000000002', containerId, negativeBid, new Date(), 'SUBMITTED']
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('inserting confidence outside 0-1 range should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.double({ min: -10, max: -0.01 }),
            fc.double({ min: 1.01, max: 10 })
          ),
          async (invalidConfidence) => {
            // Create vessel
            const vesselResult = await query(
              `INSERT INTO vessels (name, imo_number, status) VALUES ($1, $2, $3) RETURNING id`,
              ['Test Vessel', '1234567', 'EN_ROUTE']
            );
            const vesselId = vesselResult.rows[0].id;

            // Attempt to insert estimated arrival with invalid confidence
            await expect(
              query(
                `INSERT INTO estimated_arrivals (vessel_id, port_id, estimated_time, confidence, generated_at) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [vesselId, 'INMUM', new Date(), invalidConfidence, new Date()]
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Data Type Constraints', () => {
    test('inserting invalid timestamp should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 7, maxLength: 7, pattern: '[0-9]' }),
          async (name, imoNumber) => {
            await expect(
              query(
                `INSERT INTO vessels (name, imo_number, status, created_at) VALUES ($1, $2, $3, $4)`,
                [name, imoNumber, 'EN_ROUTE', 'invalid-date']
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('inserting invalid JSON in metadata should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 4, maxLength: 11 }),
          async (containerId) => {
            // Create container first
            await query(
              `INSERT INTO containers (id, owner_id, status) VALUES ($1, $2, $3)`,
              [containerId, '00000000-0000-0000-0000-000000000001', 'AT_PORT']
            );

            // Attempt to insert journey event with invalid JSON
            await expect(
              query(
                `INSERT INTO journey_events (container_id, timestamp, event_type, metadata) 
                 VALUES ($1, $2, $3, $4)`,
                [containerId, new Date(), 'container.loaded', 'invalid-json']
              )
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

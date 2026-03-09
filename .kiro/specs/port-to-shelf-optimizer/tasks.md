# Implementation Plan: National Port-to-Shelf Optimizer

## Overview

This implementation plan breaks down the Port-to-Shelf Optimizer into discrete, incremental coding tasks. The system will be built as a TypeScript-based microservices architecture with comprehensive property-based testing. Each task builds on previous work, with checkpoints to ensure quality and allow for user feedback.

## Tasks

- [x] 1. Project setup and infrastructure foundation
  - Initialize TypeScript monorepo with workspaces for each microservice
  - Configure build tools (tsconfig, webpack/esbuild)
  - Set up testing frameworks (Jest for unit tests, fast-check for property tests)
  - Configure linting (ESLint) and formatting (Prettier)
  - Set up Docker Compose for local development (PostgreSQL, Redis, Kafka)
  - Create shared types package for common interfaces
  - _Requirements: 9.3, 9.4_

- [ ]* 1.1 Write property test for project configuration
  - **Property: Build Configuration Consistency**
  - Verify all services can import shared types correctly
  - _Requirements: 9.3_

- [x] 2. Database schema and data layer
  - [x] 2.1 Implement database schema
    - Create PostgreSQL migration scripts for all tables (vessels, containers, auctions, bids, etc.)
    - Add indexes for performance (journey_events, bids, ulip_events)
    - Implement foreign key constraints and check constraints
    - _Requirements: 9.3, 17.1, 17.2_

  - [x] 2.2 Create database connection and ORM setup
    - Configure TypeORM or Prisma for database access
    - Implement connection pooling with automatic reconnection
    - Create base repository pattern for CRUD operations
    - _Requirements: 9.3, 9.4_

  - [x] 2.3 Write property tests for data integrity
    - **Property 42: Data Integrity Constraints**
    - **Validates: Requirements 9.3**

- [x] 3. Checkpoint - Database foundation
  - Ensure all migrations run successfully
  - Verify database constraints are enforced
  - Ask the user if questions arise


- [x] 4. Authentication and authorization service
  - [x] 4.1 Implement authentication service
    - Create User entity and repository
    - Implement password hashing (bcrypt)
    - Implement JWT token generation and validation
    - Create authenticate() and validateToken() methods
    - _Requirements: 10.1, 10.2_

  - [x] 4.2 Implement role-based authorization
    - Define Role enum (RETAILER, PORT_OPERATOR, TRANSPORT_COORDINATOR, SYSTEM_ADMINISTRATOR)
    - Implement authorize() method with role checking
    - Create authorization middleware for API routes
    - _Requirements: 10.2, 10.3_

  - [x] 4.3 Implement authentication logging
    - Log failed authentication attempts with username, timestamp, and reason
    - Create security event monitoring
    - _Requirements: 10.5_

  - [x] 4.4 Write property test for authentication
    - **Property 43: Authentication Success and Failure**
    - **Validates: Requirements 10.1**

  - [x] 4.5 Write property test for authorization
    - **Property 44: Authorization Enforcement**
    - **Validates: Requirements 10.3**

  - [x] 4.6 Write property test for failed authentication logging
    - **Property 46: Failed Authentication Logging**
    - **Validates: Requirements 10.5**

  - [x] 4.7 Write unit tests for authentication edge cases
    - Test expired tokens
    - Test invalid credentials
    - Test missing authorization headers
    - _Requirements: 10.1, 10.3_

- [x] 5. API Gateway setup
  - [x] 5.1 Implement API Gateway with Kong or Express Gateway
    - Configure routing to microservices
    - Implement rate limiting
    - Configure CORS policy
    - Integrate authentication middleware
    - _Requirements: 10.1_

  - [x] 5.2 Write unit tests for API Gateway
    - Test rate limiting enforcement
    - Test authentication requirement on protected routes
    - Test CORS headers
    - _Requirements: 10.1_

- [x] 6. Event Bus implementation
  - [x] 6.1 Set up Kafka event bus
    - Configure Kafka topics for all event types
    - Implement event publisher with idempotency
    - Implement event subscriber with consumer groups
    - Create event schema registry
    - _Requirements: 9.1, 9.2_

  - [x] 6.2 Create event type definitions
    - Define all event types (vessel.position.updated, container.mode.changed, etc.)
    - Implement event serialization/deserialization
    - _Requirements: 9.1, 9.2_

  - [x] 6.3 Write unit tests for event bus
    - Test event publishing
    - Test event subscription
    - Test idempotency with duplicate event IDs
    - _Requirements: 9.1, 9.2_

- [ ] 7. Checkpoint - Core infrastructure
  - Ensure authentication works end-to-end
  - Verify event bus can publish and consume events
  - Ask the user if questions arise


- [ ] 8. Vessel Tracking Service
  - [ ] 8.1 Implement Vessel entity and repository
    - Create Vessel, Position, EstimatedArrival interfaces
    - Implement vessel CRUD operations
    - Create vessel status enum
    - _Requirements: 1.1, 1.4_

  - [ ] 8.2 Implement vessel tracking methods
    - Implement registerVessel() method
    - Implement updatePosition() method with position history
    - Implement recordArrival() method
    - Implement getVessel() and listActiveVessels() methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 8.3 Integrate vessel tracking with event bus
    - Publish vessel.position.updated events
    - Publish vessel.arrived events
    - _Requirements: 1.2, 1.3_

  - [ ] 8.4 Write property test for vessel tracking initialization
    - **Property 1: Vessel Tracking Initialization**
    - **Validates: Requirements 1.1**

  - [ ] 8.5 Write property test for position update recalculation
    - **Property 2: Position Update Triggers Recalculation**
    - **Validates: Requirements 1.2**

  - [ ] 8.6 Write property test for arrival recording
    - **Property 3: Arrival Recording Completeness**
    - **Validates: Requirements 1.3**

  - [ ] 8.7 Write property test for vessel registry
    - **Property 4: Vessel Registry Completeness**
    - **Validates: Requirements 1.4**

  - [ ] 8.8 Write property test for vessel query response
    - **Property 5: Vessel Query Response Completeness**
    - **Validates: Requirements 1.5**

  - [ ] 8.9 Write unit tests for vessel tracking edge cases
    - Test vessel with empty manifest
    - Test duplicate IMO number rejection
    - Test invalid position coordinates
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 9. Container Tracking Service
  - [ ] 9.1 Implement Container entity and repository
    - Create Container, Location, JourneyEvent, DemurrageInfo interfaces
    - Implement ISO 6346 container ID validation
    - Implement UN/LOCODE location validation
    - Create container status and transport mode enums
    - _Requirements: 2.1, 17.1, 17.2_

  - [ ] 9.2 Implement container tracking methods
    - Implement createContainer() method
    - Implement updateTransportMode() method
    - Implement getContainerJourney() method
    - Implement queryContainers() method with filtering
    - Implement markDelivered() method
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 9.3 Implement demurrage tracking
    - Calculate demurrage-free time on container arrival at port
    - Flag containers as high priority when < 24 hours remaining
    - Track demurrage costs
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [ ] 9.4 Integrate container tracking with event bus
    - Publish container.mode.changed events
    - Publish container.delivered events
    - Publish demurrage.alert events
    - _Requirements: 2.2, 2.5, 6.2_

  - [ ] 9.5 Write property test for container tracking record creation
    - **Property 6: Container Tracking Record Creation**
    - **Validates: Requirements 2.1**

  - [ ] 9.6 Write property test for transport mode transition
    - **Property 7: Transport Mode Transition Recording**
    - **Validates: Requirements 2.2**

  - [ ] 9.7 Write property test for journey history completeness
    - **Property 8: Journey History Completeness**
    - **Validates: Requirements 2.3**

  - [ ] 9.8 Write property test for container location consistency
    - **Property 9: Container Location Consistency**
    - **Validates: Requirements 2.4**

  - [ ] 9.9 Write property test for journey completion marking
    - **Property 10: Journey Completion Marking**
    - **Validates: Requirements 2.5**

  - [ ] 9.10 Write property test for demurrage-free time calculation
    - **Property 25: Demurrage-Free Time Calculation**
    - **Validates: Requirements 6.1**

  - [ ] 9.11 Write property test for high priority flagging
    - **Property 26: High Priority Flagging**
    - **Validates: Requirements 6.2**

  - [ ] 9.12 Write property test for retailer data isolation
    - **Property 45: Retailer Data Isolation**
    - **Validates: Requirements 10.4**

  - [ ] 9.13 Write unit tests for container tracking edge cases
    - Test invalid ISO 6346 container ID
    - Test invalid UN/LOCODE
    - Test container with no journey events
    - _Requirements: 2.1, 17.1, 17.2_

- [ ] 10. Checkpoint - Tracking services
  - Ensure vessels and containers can be tracked
  - Verify events are published correctly
  - Ask the user if questions arise


- [ ] 11. AI Prediction Service
  - [ ] 11.1 Implement prediction data models
    - Create ArrivalPrediction, PredictionFactors, WeatherData, AccuracyMetrics interfaces
    - Create prediction repository for storing predictions
    - _Requirements: 3.1, 3.5_

  - [ ] 11.2 Implement basic prediction algorithm
    - Calculate ETA based on current speed and distance
    - Incorporate weather conditions (wind speed, wave height)
    - Calculate confidence intervals
    - _Requirements: 3.1, 3.2_

  - [ ] 11.3 Implement prediction service methods
    - Implement predictArrival() method
    - Implement updatePrediction() method
    - Implement evaluatePredictionAccuracy() method
    - Store predictions in time series database
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [ ] 11.4 Integrate prediction service with event bus
    - Subscribe to vessel.position.updated events
    - Publish prediction.generated events
    - Publish prediction.updated events
    - _Requirements: 3.1, 3.2_

  - [ ] 11.5 Write property test for prediction generation
    - **Property 11: Prediction Generation for En-Route Vessels**
    - **Validates: Requirements 3.1**

  - [ ] 11.6 Write property test for prediction update
    - **Property 12: Prediction Update on New Data**
    - **Validates: Requirements 3.2**

  - [ ] 11.7 Write property test for low confidence flagging
    - **Property 13: Low Confidence Flagging**
    - **Validates: Requirements 3.4**

  - [ ] 11.8 Write property test for accuracy metrics storage
    - **Property 14: Prediction Accuracy Metrics Storage**
    - **Validates: Requirements 3.5**

  - [ ] 11.9 Write unit tests for prediction edge cases
    - Test prediction with missing weather data
    - Test prediction for vessel at port
    - Test prediction accuracy evaluation
    - _Requirements: 3.1, 3.4, 3.5_

- [ ] 12. Slot Management Service
  - [ ] 12.1 Implement slot data models
    - Create Slot, SlotCreationRequest, Route, Reservation, CapacityInfo interfaces
    - Create slot and reservation repositories
    - _Requirements: 4.1, 4.4, 4.5_

  - [ ] 12.2 Implement capacity tracking
    - Create capacity tracking for rail and road by route
    - Implement updateCapacity() method
    - Implement getAvailableCapacity() method
    - Ensure separate tracking for rail and road modes
    - _Requirements: 4.4, 4.5, 7.3, 7.4, 7.5_

  - [ ] 12.3 Implement slot management methods
    - Implement createSlots() method based on predictions
    - Implement reserveSlot() method with capacity checking
    - Implement releaseSlot() method
    - Prioritize high-priority containers in slot creation
    - _Requirements: 4.1, 4.4, 4.5, 6.3_

  - [ ] 12.4 Integrate slot management with event bus
    - Subscribe to prediction.generated events
    - Publish slot.reserved events
    - _Requirements: 4.1, 4.5_

  - [ ] 12.5 Write property test for slot creation from predictions
    - **Property 15: Slot Creation from Predictions**
    - **Validates: Requirements 4.1**

  - [ ] 12.6 Write property test for capacity constraint enforcement
    - **Property 18: Capacity Constraint Enforcement**
    - **Validates: Requirements 4.4**

  - [ ] 12.7 Write property test for slot assignment updates availability
    - **Property 19: Slot Assignment Updates Availability**
    - **Validates: Requirements 4.5**

  - [ ] 12.8 Write property test for capacity update processing
    - **Property 32: Capacity Update Processing**
    - **Validates: Requirements 7.3**

  - [ ] 12.9 Write property test for separate mode capacity tracking
    - **Property 34: Separate Mode Capacity Tracking**
    - **Validates: Requirements 7.5**

  - [ ] 12.10 Write unit tests for slot management edge cases
    - Test slot creation with zero capacity
    - Test reservation expiration
    - Test capacity decrease affecting future slots
    - _Requirements: 4.4, 4.5, 7.4_

- [ ] 13. Checkpoint - Prediction and slot management
  - Ensure predictions trigger slot creation
  - Verify capacity constraints are enforced
  - Ask the user if questions arise


- [ ] 14. Auction Service
  - [ ] 14.1 Implement auction data models
    - Create Auction, Bid, BidSubmission, AuctionResult, BidWinner interfaces
    - Create auction and bid repositories
    - Create auction and bid status enums
    - _Requirements: 4.2, 4.3, 5.2_

  - [ ] 14.2 Implement auction service methods
    - Implement createAuction() method
    - Implement submitBid() method with validation
    - Implement closeAuction() method with winner selection
    - Implement getAuction() and listActiveAuctions() methods
    - _Requirements: 4.2, 4.3, 5.1, 5.2, 5.3_

  - [ ] 14.3 Implement bid validation
    - Validate bid amount against minimum bid
    - Validate container ownership
    - Prevent cross-retailer bidding
    - _Requirements: 5.2, 5.4_

  - [ ] 14.4 Implement auction closing logic
    - Select highest bidder for each slot
    - Update bid statuses (ACCEPTED, REJECTED, OUTBID)
    - Create booking confirmations for winners
    - Send notifications to all bidders
    - _Requirements: 4.3, 5.3, 5.5_

  - [ ] 14.5 Integrate auction service with event bus
    - Subscribe to slot creation events
    - Publish auction.created events
    - Publish auction.closed events
    - Publish bid.submitted events
    - _Requirements: 4.2, 4.3, 5.5_

  - [ ] 14.6 Write property test for auction initiation
    - **Property 16: Auction Initiation on Slot Creation**
    - **Validates: Requirements 4.2**

  - [ ] 14.7 Write property test for highest bidder wins
    - **Property 17: Highest Bidder Wins**
    - **Validates: Requirements 4.3**

  - [ ] 14.8 Write property test for auction filtering by destination
    - **Property 20: Auction Filtering by Destination**
    - **Validates: Requirements 5.1**

  - [ ] 14.9 Write property test for bid validation
    - **Property 21: Bid Validation**
    - **Validates: Requirements 5.2**

  - [ ] 14.10 Write property test for accepted bid confirmation
    - **Property 22: Accepted Bid Confirmation Completeness**
    - **Validates: Requirements 5.3**

  - [ ] 14.11 Write property test for container ownership enforcement
    - **Property 23: Container Ownership Enforcement**
    - **Validates: Requirements 5.4**

  - [ ] 14.12 Write property test for auction end notification
    - **Property 24: Auction End Notification**
    - **Validates: Requirements 5.5**

  - [ ] 14.13 Write property test for priority container slot preference
    - **Property 27: Priority Container Slot Preference**
    - **Validates: Requirements 6.3**

  - [ ] 14.14 Write unit tests for auction edge cases
    - Test auction with no bids
    - Test auction with single bid
    - Test bid on expired auction
    - _Requirements: 4.3, 5.2_

- [ ] 15. Performance Metrics and Reporting Service
  - [ ] 15.1 Implement metrics data models
    - Create interfaces for timeline metrics, demurrage metrics, auction metrics
    - Create metrics repository
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 15.2 Implement metrics calculation methods
    - Calculate port-to-shelf timeline for completed journeys
    - Calculate average demurrage costs
    - Calculate auction participation rates
    - Calculate slot utilization rates
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 15.3 Implement reporting methods
    - Generate performance reports with all required metrics
    - Include baseline comparison when available
    - _Requirements: 8.3, 8.5_

  - [ ] 15.4 Integrate metrics service with event bus
    - Subscribe to container.delivered events
    - Subscribe to auction.closed events
    - _Requirements: 8.1, 8.4_

  - [ ] 15.5 Write property test for timeline calculation
    - **Property 35: Port-to-Shelf Timeline Calculation**
    - **Validates: Requirements 8.1**

  - [ ] 15.6 Write property test for average demurrage cost
    - **Property 36: Average Demurrage Cost Calculation**
    - **Validates: Requirements 8.2**

  - [ ] 15.7 Write property test for report metrics completeness
    - **Property 37: Report Metrics Completeness**
    - **Validates: Requirements 8.3**

  - [ ] 15.8 Write property test for auction metrics tracking
    - **Property 38: Auction Metrics Tracking**
    - **Validates: Requirements 8.4**

  - [ ] 15.9 Write property test for baseline comparison
    - **Property 39: Baseline Comparison Metrics**
    - **Validates: Requirements 8.5**

  - [ ] 15.10 Write unit tests for metrics edge cases
    - Test metrics with no completed journeys
    - Test metrics with zero demurrage costs
    - Test report generation without baseline
    - _Requirements: 8.1, 8.2, 8.5_

- [ ] 16. Checkpoint - Core business logic complete
  - Ensure auctions work end-to-end
  - Verify metrics are calculated correctly
  - Ask the user if questions arise


- [ ] 17. ULIP Integration Service - Authentication and Core
  - [ ] 17.1 Implement ULIP authentication
    - Implement OAuth 2.0 client for ULIP
    - Implement authenticate() method to obtain access tokens
    - Implement token refresh logic
    - Implement connection health monitoring
    - _Requirements: 11.1, 11.2, 11.5_

  - [ ] 17.2 Implement ULIP event publishing
    - Implement publishEvent() method
    - Implement rate limiting with exponential backoff
    - Implement retry logic with circuit breaker
    - Ensure events published within 30 seconds
    - _Requirements: 11.3, 11.4, 12.1_

  - [ ] 17.3 Implement ULIP event subscription
    - Implement subscribeToEvents() method
    - Subscribe to port operations, rail movements, road transport events
    - Implement event validation against ULIP schemas
    - Implement conflict resolution with timestamp precedence
    - _Requirements: 12.3, 12.4, 12.5_

  - [ ] 17.4 Write property test for OAuth 2.0 authentication
    - **Property 47: OAuth 2.0 ULIP Authentication**
    - **Validates: Requirements 11.2**

  - [ ] 17.5 Write property test for ULIP data format compliance
    - **Property 48: ULIP Data Format Compliance**
    - **Validates: Requirements 11.3**

  - [ ] 17.6 Write property test for rate limit backoff
    - **Property 49: Rate Limit Backoff**
    - **Validates: Requirements 11.4**

  - [ ] 17.7 Write property test for connection resilience
    - **Property 50: ULIP Connection Resilience**
    - **Validates: Requirements 11.5**

  - [ ] 17.8 Write property test for container event publishing
    - **Property 51: Container Event Publishing to ULIP**
    - **Validates: Requirements 12.1**

  - [ ] 17.9 Write property test for vessel data synchronization
    - **Property 52: Vessel Data Synchronization to ULIP**
    - **Validates: Requirements 12.2**

  - [ ] 17.10 Write property test for ULIP data validation
    - **Property 53: ULIP Event Data Validation**
    - **Validates: Requirements 12.4**

  - [ ] 17.11 Write property test for timestamp-based conflict resolution
    - **Property 54: Timestamp-Based Conflict Resolution**
    - **Validates: Requirements 12.5**

  - [ ] 17.12 Write unit tests for ULIP integration edge cases
    - Test authentication failure
    - Test token expiration
    - Test rate limit response handling
    - Test circuit breaker opening
    - _Requirements: 11.2, 11.4, 11.5_

- [ ] 18. ULIP Integration Service - Port Community Systems
  - [ ] 18.1 Implement port integration methods
    - Implement queryPortData() method
    - Connect to major Indian ports via ULIP (Mumbai, Chennai, Kolkata, Visakhapatnam)
    - Process berthing notifications
    - Process gate-in/gate-out events
    - Publish container pickup requests
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 18.2 Write property test for berthing notification processing
    - **Property 55: Berthing Notification Processing**
    - **Validates: Requirements 13.2**

  - [ ] 18.3 Write property test for gate event processing
    - **Property 56: Gate Event Processing**
    - **Validates: Requirements 13.3**

  - [ ] 18.4 Write property test for port data query
    - **Property 57: Port Data Query for Slot Planning**
    - **Validates: Requirements 13.4**

  - [ ] 18.5 Write property test for container pickup request
    - **Property 58: Container Pickup Request Publishing**
    - **Validates: Requirements 13.5**

  - [ ] 18.6 Write unit tests for port integration edge cases
    - Test berthing notification with missing data
    - Test gate event for unknown container
    - Test port data query timeout
    - _Requirements: 13.2, 13.3, 13.4_

- [ ] 19. ULIP Integration Service - CONCOR Rail Integration
  - [ ] 19.1 Implement rail integration methods
    - Implement queryRailCapacity() method
    - Implement createRailBooking() method
    - Process rail wagon tracking updates
    - Process rail delay notifications
    - Query rail routes and transit times
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 19.2 Write property test for rail capacity data access
    - **Property 59: Rail Capacity Data Access**
    - **Validates: Requirements 14.1**

  - [ ] 19.3 Write property test for rail booking request creation
    - **Property 60: Rail Booking Request Creation**
    - **Validates: Requirements 14.2**

  - [ ] 19.4 Write property test for rail tracking update processing
    - **Property 61: Rail Tracking Update Processing**
    - **Validates: Requirements 14.3**

  - [ ] 19.5 Write property test for rail delay notification
    - **Property 62: Rail Delay Notification Processing**
    - **Validates: Requirements 14.4**

  - [ ] 19.6 Write property test for rail route query
    - **Property 63: Rail Route Query**
    - **Validates: Requirements 14.5**

  - [ ] 19.7 Write property test for rail booking communication
    - **Property 30: Rail Booking Communication**
    - **Validates: Requirements 7.1**

  - [ ] 19.8 Write unit tests for rail integration edge cases
    - Test rail booking with no available capacity
    - Test rail delay notification processing
    - Test rail route query with no routes
    - _Requirements: 14.1, 14.2, 14.4_

- [ ] 20. Checkpoint - ULIP integration foundation
  - Ensure ULIP authentication works
  - Verify event publishing and subscription
  - Ask the user if questions arise


- [ ] 21. ULIP Integration Service - Road Transport Integration
  - [ ] 21.1 Implement road transport integration methods
    - Implement queryTruckAvailability() method
    - Implement createTruckBooking() method
    - Process GPS truck location updates
    - Access FASTag toll data
    - Process delivery confirmations
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 21.2 Write property test for truck fleet availability access
    - **Property 64: Truck Fleet Availability Access**
    - **Validates: Requirements 15.1**

  - [ ] 21.3 Write property test for truck transport order creation
    - **Property 65: Truck Transport Order Creation**
    - **Validates: Requirements 15.2**

  - [ ] 21.4 Write property test for GPS location update processing
    - **Property 66: GPS Truck Location Update Processing**
    - **Validates: Requirements 15.3**

  - [ ] 21.5 Write property test for FASTag toll data access
    - **Property 67: FASTag Toll Data Access**
    - **Validates: Requirements 15.4**

  - [ ] 21.6 Write property test for delivery confirmation processing
    - **Property 68: Delivery Confirmation Processing**
    - **Validates: Requirements 15.5**

  - [ ] 21.7 Write property test for road booking communication
    - **Property 31: Road Booking Communication**
    - **Validates: Requirements 7.2**

  - [ ] 21.8 Write unit tests for road transport edge cases
    - Test truck booking with no available trucks
    - Test GPS update for unknown truck
    - Test delivery confirmation for wrong container
    - _Requirements: 15.1, 15.2, 15.5_

- [ ] 22. ULIP Integration Service - Customs Integration
  - [ ] 22.1 Implement customs integration methods
    - Implement getCustomsStatus() method
    - Implement submitCustomsDocuments() method
    - Process customs clearance notifications
    - Access ICEGATE data
    - Process regulatory hold alerts
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ] 22.2 Write property test for customs status query
    - **Property 69: Customs Status Query**
    - **Validates: Requirements 16.1**

  - [ ] 22.3 Write property test for customs clearance notification
    - **Property 70: Customs Clearance Notification Processing**
    - **Validates: Requirements 16.2**

  - [ ] 22.4 Write property test for customs document submission
    - **Property 71: Customs Document Submission**
    - **Validates: Requirements 16.3**

  - [ ] 22.5 Write property test for ICEGATE data access
    - **Property 72: ICEGATE Data Access**
    - **Validates: Requirements 16.4**

  - [ ] 22.6 Write property test for regulatory hold alert
    - **Property 73: Regulatory Hold Alert Processing**
    - **Validates: Requirements 16.5**

  - [ ] 22.7 Write unit tests for customs integration edge cases
    - Test customs status for unknown container
    - Test document submission failure
    - Test regulatory hold processing
    - _Requirements: 16.1, 16.3, 16.5_

- [ ] 23. ULIP Data Standards Compliance
  - [ ] 23.1 Implement data format validators
    - Implement ISO 6346 container ID validator
    - Implement UN/LOCODE location validator
    - Implement ISO 8601 timestamp formatter with IST
    - Implement ULIP event taxonomy validator
    - Implement ULIP JSON schema validator
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ] 23.2 Write property test for ISO 6346 format
    - **Property 74: ISO 6346 Container ID Format**
    - **Validates: Requirements 17.1**

  - [ ] 23.3 Write property test for UN/LOCODE format
    - **Property 75: UN/LOCODE Location Format**
    - **Validates: Requirements 17.2**

  - [ ] 23.4 Write property test for ISO 8601 timestamp format
    - **Property 76: ISO 8601 Timestamp Format with IST**
    - **Validates: Requirements 17.3**

  - [ ] 23.5 Write property test for ULIP event taxonomy
    - **Property 77: ULIP Event Taxonomy Compliance**
    - **Validates: Requirements 17.4**

  - [ ]* 23.6 Write property test for ULIP JSON schema validation (round-trip)
    - **Property 78: ULIP JSON Schema Validation (Round-Trip)**
    - **Validates: Requirements 17.5**

  - [ ] 23.7 Write unit tests for data format validation edge cases
    - Test invalid ISO 6346 container IDs
    - Test invalid UN/LOCODE formats
    - Test timestamp timezone conversion
    - _Requirements: 17.1, 17.2, 17.3_

- [ ] 24. ULIP Analytics and Reporting Integration
  - [ ] 24.1 Implement analytics integration methods
    - Publish performance metrics to ULIP analytics module
    - Access ULIP national logistics dashboard data
    - Include ULIP data in generated reports
    - Subscribe to ULIP predictive analytics feeds
    - Contribute anonymized operational data
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 24.2 Write property test for performance metrics publishing
    - **Property 79: Performance Metrics Publishing to ULIP**
    - **Validates: Requirements 18.1**

  - [ ] 24.3 Write property test for ULIP dashboard data access
    - **Property 80: ULIP Dashboard Data Access**
    - **Validates: Requirements 18.2**

  - [ ] 24.4 Write property test for report ULIP data inclusion
    - **Property 81: Report ULIP Data Inclusion**
    - **Validates: Requirements 18.3**

  - [ ] 24.5 Write property test for anonymized data contribution
    - **Property 82: Anonymized Data Contribution to ULIP**
    - **Validates: Requirements 18.5**

  - [ ] 24.6 Write unit tests for analytics integration edge cases
    - Test metrics publishing with missing data
    - Test dashboard data access timeout
    - Test anonymization of sensitive data
    - _Requirements: 18.1, 18.2, 18.5_

- [ ] 25. Checkpoint - ULIP integration complete
  - Ensure all ULIP integrations work end-to-end
  - Verify data standards compliance
  - Ask the user if questions arise


- [ ] 26. Data persistence and reliability
  - [ ] 26.1 Implement event persistence
    - Ensure all container tracking events persist immediately
    - Ensure all auction transactions persist with timestamps
    - Implement transaction management for critical operations
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 26.2 Implement backup and recovery
    - Configure automated database backups
    - Implement point-in-time recovery
    - Test recovery procedures
    - _Requirements: 9.4, 9.5_

  - [ ] 26.3 Write property test for container event persistence
    - **Property 40: Container Event Persistence**
    - **Validates: Requirements 9.1**

  - [ ] 26.4 Write property test for auction transaction persistence
    - **Property 41: Auction Transaction Persistence**
    - **Validates: Requirements 9.2**

  - [ ] 26.5 Write unit tests for data persistence edge cases
    - Test transaction rollback on error
    - Test recovery from database connection failure
    - Test backup creation and restoration
    - _Requirements: 9.2, 9.3, 9.4_

- [ ] 27. Error handling and resilience
  - [ ] 27.1 Implement error response format
    - Create standardized ErrorResponse interface
    - Implement error logging with structured format
    - Implement error metrics tracking
    - _Requirements: All_

  - [ ] 27.2 Implement retry and circuit breaker patterns
    - Implement exponential backoff for ULIP calls
    - Implement circuit breaker for external integrations
    - Implement request queuing for failed operations
    - _Requirements: 11.4, 11.5_

  - [ ] 27.3 Implement idempotency for critical operations
    - Use container ID as idempotency key for container creation
    - Use bid ID as idempotency key for bid submission
    - Use reservation ID as idempotency key for slot reservation
    - Use event ID as idempotency key for ULIP event publishing
    - _Requirements: 9.1, 9.2_

  - [ ] 27.4 Write unit tests for error handling
    - Test validation error responses
    - Test integration error retry logic
    - Test authorization error responses
    - Test idempotency with duplicate requests
    - _Requirements: 11.4, 11.5_

- [ ] 28. API endpoints and REST controllers
  - [ ] 28.1 Implement vessel tracking endpoints
    - POST /vessels - Register vessel
    - PUT /vessels/:id/position - Update position
    - GET /vessels/:id - Get vessel details
    - GET /vessels - List active vessels
    - POST /vessels/:id/arrival - Record arrival
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 28.2 Implement container tracking endpoints
    - POST /containers - Create container
    - PUT /containers/:id/transport-mode - Update transport mode
    - GET /containers/:id/journey - Get container journey
    - GET /containers - Query containers
    - POST /containers/:id/delivered - Mark delivered
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 28.3 Implement auction endpoints
    - GET /auctions - List active auctions
    - GET /auctions/:id - Get auction details
    - POST /auctions/:id/bids - Submit bid
    - _Requirements: 5.1, 5.2_

  - [ ] 28.4 Implement metrics endpoints
    - GET /metrics/performance - Get performance metrics
    - GET /reports - Generate reports
    - _Requirements: 8.3_

  - [ ] 28.5 Write integration tests for API endpoints
    - Test vessel tracking flow
    - Test container tracking flow
    - Test auction bidding flow
    - Test authentication and authorization on all endpoints
    - _Requirements: 1.1-1.5, 2.1-2.5, 5.1-5.2, 10.1-10.3_

- [ ] 29. Checkpoint - API layer complete
  - Ensure all endpoints work correctly
  - Verify authentication and authorization
  - Ask the user if questions arise

- [ ] 30. Property test generators and arbitraries
  - [ ] 30.1 Create custom generators for domain types
    - ISO 6346 container ID generator
    - UN/LOCODE location generator
    - Vessel generator with valid IMO numbers
    - Position generator with valid coordinates
    - Bid generator with valid amounts
    - _Requirements: 17.1, 17.2_

  - [ ] 30.2 Create generators for complex scenarios
    - Auction with multiple bids generator
    - Container journey with multiple transport modes generator
    - Vessel with arrival prediction generator
    - _Requirements: All property tests_

  - [ ] 30.3 Write unit tests for generators
    - Test ISO 6346 generator produces valid IDs
    - Test UN/LOCODE generator produces valid codes
    - Test position generator produces valid coordinates
    - _Requirements: 17.1, 17.2_

- [ ] 31. Integration testing and end-to-end flows
  - [ ] 31.1 Write integration test for vessel arrival to auction flow
    - Test vessel enters waters → prediction → slots created → auction initiated
    - _Requirements: 1.1, 3.1, 4.1, 4.2_

  - [ ] 31.2 Write integration test for container journey flow
    - Test container on vessel → at port → on rail → on truck → delivered
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 31.3 Write integration test for auction bidding flow
    - Test auction created → bids submitted → auction closed → winners notified
    - _Requirements: 4.2, 5.2, 4.3, 5.5_

  - [ ] 31.4 Write integration test for ULIP synchronization flow
    - Test container event → published to ULIP → received by subscribers
    - _Requirements: 12.1, 12.3_

  - [ ] 31.5 Write integration test for demurrage priority flow
    - Test container at port → demurrage time low → flagged priority → prioritized in auction
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 32. Performance testing and optimization
  - [ ] 32.1 Set up performance testing with k6
    - Create load test scenarios
    - Create stress test scenarios
    - Create spike test scenarios
    - _Requirements: All_

  - [ ] 32.2 Run performance tests and optimize
    - Test API response times (target: p95 < 500ms)
    - Test throughput (target: 10,000 req/s)
    - Test ULIP event publishing latency (target: < 30s)
    - Optimize database queries with indexes
    - Optimize caching strategy
    - _Requirements: 12.1_

- [ ] 33. Monitoring and observability
  - [ ] 33.1 Implement logging
    - Configure structured logging (JSON format)
    - Log all errors with context
    - Log security events
    - _Requirements: 10.5_

  - [ ] 33.2 Implement metrics and alerting
    - Track error rates by category and service
    - Track API response times
    - Track ULIP integration health
    - Configure alerts for critical errors
    - _Requirements: All_

  - [ ] 33.3 Write unit tests for monitoring
    - Test log format
    - Test metric collection
    - Test alert triggering
    - _Requirements: 10.5_

- [ ] 34. Documentation and deployment
  - [ ] 34.1 Create API documentation
    - Generate OpenAPI/Swagger documentation
    - Document authentication flow
    - Document all endpoints with examples
    - _Requirements: All_

  - [ ] 34.2 Create deployment configuration
    - Create Kubernetes manifests for all services
    - Configure service discovery
    - Configure load balancing
    - Configure auto-scaling
    - _Requirements: All_

  - [ ] 34.3 Create CI/CD pipeline
    - Configure automated testing
    - Configure Docker image building
    - Configure deployment to staging
    - Configure smoke tests
    - _Requirements: All_

- [ ] 35. Final checkpoint - System complete
  - Run full test suite (unit + property + integration)
  - Verify all requirements are met
  - Verify all properties pass
  - Deploy to staging environment
  - Run smoke tests
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- All property tests must be tagged with: `Feature: port-to-shelf-optimizer, Property {number}: {property_text}`
- TypeScript will be used for all implementation
- fast-check will be used for property-based testing
- Jest will be used for unit testing

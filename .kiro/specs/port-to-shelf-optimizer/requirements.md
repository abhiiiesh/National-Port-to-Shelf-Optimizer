# Requirements Document

## Introduction

The National Port-to-Shelf Optimizer is a multimodal AI coordination system that synchronizes BCSL vessel arrivals with India's domestic rail (CONCOR) and road networks. The system integrates with India's Unified Logistics Interface Platform (ULIP) to provide true multimodal visibility by tracking containers from ship arrival at ports (e.g., Mumbai) through rail and road transport to final warehouse destinations (e.g., Delhi). The core innovation is Dynamic Slot Auctioning, which predicts arrival times and automatically auctions transportation slots to retailers, ensuring containers never sit idle at ports and minimizing demurrage fees. By leveraging ULIP's standardized APIs and data exchange protocols, the system achieves seamless integration across multiple government and private logistics stakeholders.

## Glossary

- **System**: The National Port-to-Shelf Optimizer
- **BCSL**: Bharat Container Shipping Line (joint venture between Shipping Corporation of India and CONCOR)
- **CONCOR**: Container Corporation of India (Railways)
- **Container**: A standardized shipping container being tracked through the multimodal network
- **Vessel**: A ship carrying containers arriving at Indian ports
- **Slot**: A reserved capacity unit on rail or truck transport
- **Demurrage**: Late fees charged when containers remain at port beyond allowed free time
- **Auction**: An automated bidding process for transportation slots
- **Retailer**: A business entity that bids on transportation slots
- **Port**: A maritime facility where vessels dock and containers are transferred
- **Warehouse**: A final destination facility where containers are delivered
- **Multimodal_Visibility**: Real-time tracking of containers across ship, rail, and road transport modes
- **Arrival_Prediction**: AI-generated estimate of when a vessel will arrive at port
- **Transport_Mode**: The method of transportation (vessel, rail, or truck)
- **ULIP**: Unified Logistics Interface Platform - India's national logistics data exchange platform
- **ULIP_API**: Application Programming Interface provided by ULIP for data exchange
- **Stakeholder**: Any entity participating in the logistics chain (ports, railways, trucking companies, customs, warehouses)
- **Data_Exchange_Protocol**: Standardized format and method for sharing logistics data via ULIP

## Requirements

### Requirement 1: Vessel Arrival Tracking

**User Story:** As a logistics coordinator, I want to track vessel arrivals in real-time, so that I can prepare for container transfers and downstream transportation.

#### Acceptance Criteria

1. WHEN a vessel enters Indian territorial waters, THE System SHALL begin tracking its position and estimated arrival time
2. WHEN vessel position data is updated, THE System SHALL recalculate the estimated arrival time at the destination port
3. WHEN a vessel arrives at port, THE System SHALL record the actual arrival timestamp
4. THE System SHALL maintain a registry of all active vessels with their container manifests
5. WHEN vessel data is queried, THE System SHALL return current position, estimated arrival time, and container count

### Requirement 2: Container Tracking and Visibility

**User Story:** As a retailer, I want to track my containers from ship to warehouse, so that I can plan inventory and logistics operations.

#### Acceptance Criteria

1. WHEN a container is loaded onto a vessel, THE System SHALL create a tracking record with unique container identifier
2. WHEN a container changes transport mode, THE System SHALL update the tracking record with the new mode and timestamp
3. WHEN a container tracking query is received, THE System SHALL return the complete journey history including all transport modes
4. THE System SHALL maintain real-time location data for all containers across all transport modes
5. WHEN a container reaches its final warehouse destination, THE System SHALL mark the journey as complete

### Requirement 3: AI-Based Arrival Prediction

**User Story:** As a port operations manager, I want accurate predictions of vessel arrival times, so that I can optimize resource allocation and slot planning.

#### Acceptance Criteria

1. WHEN a vessel is en route to port, THE System SHALL generate arrival time predictions using historical data, weather conditions, and current vessel speed
2. WHEN new data becomes available, THE System SHALL update arrival predictions and recalculate confidence intervals
3. THE System SHALL provide arrival predictions with accuracy within 2 hours for vessels within 24 hours of arrival
4. WHEN prediction accuracy falls below threshold, THE System SHALL flag the prediction as low confidence
5. THE System SHALL store historical prediction accuracy metrics for continuous model improvement

### Requirement 4: Dynamic Slot Auctioning

**User Story:** As a system administrator, I want to automatically auction transportation slots based on predicted arrivals, so that containers move efficiently from port to destination without idle time.

#### Acceptance Criteria

1. WHEN a vessel arrival prediction is generated, THE System SHALL create available transportation slots for rail and truck based on predicted container volume
2. WHEN slots are created, THE System SHALL initiate an auction process with registered retailers
3. WHEN an auction closes, THE System SHALL assign slots to the highest bidders and notify all participants
4. THE System SHALL prevent slot allocation that exceeds available rail or truck capacity
5. WHEN a slot is assigned, THE System SHALL reserve the capacity and update availability in real-time

### Requirement 5: Retailer Bidding Interface

**User Story:** As a retailer, I want to bid on transportation slots for my containers, so that I can secure timely delivery and avoid demurrage fees.

#### Acceptance Criteria

1. WHEN a retailer logs into the system, THE System SHALL display available auctions for slots matching their container destinations
2. WHEN a retailer submits a bid, THE System SHALL validate the bid amount and container eligibility
3. WHEN a bid is accepted, THE System SHALL confirm the slot reservation and provide booking details
4. THE System SHALL prevent retailers from bidding on slots for containers they do not own
5. WHEN an auction ends, THE System SHALL notify the retailer of bid success or failure within 1 minute

### Requirement 6: Demurrage Minimization

**User Story:** As a logistics coordinator, I want the system to prioritize containers at risk of demurrage, so that we minimize late fees and optimize port throughput.

#### Acceptance Criteria

1. WHEN a container arrives at port, THE System SHALL calculate the demurrage-free time remaining based on port regulations
2. WHEN demurrage-free time falls below 24 hours, THE System SHALL flag the container as high priority
3. WHEN creating auction slots, THE System SHALL prioritize high-priority containers for immediate transport
4. THE System SHALL track actual demurrage costs incurred for all containers
5. WHEN a container incurs demurrage, THE System SHALL record the cost and associate it with the container journey

### Requirement 7: Rail and Road Network Integration

**User Story:** As a transport coordinator, I want the system to integrate with CONCOR rail and road networks, so that I can manage multimodal transport seamlessly.

#### Acceptance Criteria

1. WHEN a slot is assigned for rail transport, THE System SHALL communicate the booking to CONCOR systems
2. WHEN a slot is assigned for road transport, THE System SHALL communicate the booking to truck fleet management systems
3. THE System SHALL receive real-time capacity updates from rail and road network providers
4. WHEN transport capacity changes, THE System SHALL adjust available slots for future auctions
5. THE System SHALL maintain separate capacity tracking for rail and road transport modes

### Requirement 8: Performance Metrics and Reporting

**User Story:** As a business analyst, I want to track system performance metrics, so that I can measure the business value and identify optimization opportunities.

#### Acceptance Criteria

1. THE System SHALL calculate and store port-to-shelf timeline for each completed container journey
2. THE System SHALL calculate average demurrage costs per container and aggregate by time period
3. WHEN a report is requested, THE System SHALL provide metrics including average timeline reduction, demurrage savings, and slot utilization rates
4. THE System SHALL track auction participation rates and average winning bid amounts
5. THE System SHALL provide comparison metrics showing performance improvements over baseline (pre-system) operations

### Requirement 9: Data Persistence and Reliability

**User Story:** As a system administrator, I want all tracking and transaction data to be reliably stored, so that we maintain audit trails and can recover from failures.

#### Acceptance Criteria

1. WHEN any container tracking event occurs, THE System SHALL persist the event to storage immediately
2. WHEN any auction transaction occurs, THE System SHALL persist the transaction details with timestamp and participant information
3. THE System SHALL maintain data integrity across all storage operations
4. WHEN a system failure occurs, THE System SHALL recover to the last consistent state without data loss
5. THE System SHALL provide data backup and recovery capabilities for all critical data

### Requirement 10: Authentication and Authorization

**User Story:** As a security administrator, I want role-based access control, so that only authorized users can perform specific operations.

#### Acceptance Criteria

1. WHEN a user attempts to access the system, THE System SHALL authenticate the user credentials
2. THE System SHALL support distinct roles including Retailer, Port_Operator, Transport_Coordinator, and System_Administrator
3. WHEN a user attempts an operation, THE System SHALL verify the user has the required role permissions
4. THE System SHALL prevent retailers from viewing or modifying other retailers' container data
5. WHEN authentication fails, THE System SHALL deny access and log the failed attempt

### Requirement 11: ULIP Platform Integration

**User Story:** As a system architect, I want to integrate with ULIP's standardized APIs, so that we can exchange data seamlessly with all logistics stakeholders in India's national ecosystem.

#### Acceptance Criteria

1. THE System SHALL register as a ULIP-compliant application and obtain valid API credentials
2. WHEN connecting to ULIP, THE System SHALL use OAuth 2.0 authentication with ULIP's authorization server
3. THE System SHALL implement ULIP's standardized data exchange protocols for container tracking, vessel movements, and transport bookings
4. WHEN ULIP API rate limits are approached, THE System SHALL implement exponential backoff and request throttling
5. THE System SHALL maintain API connection health monitoring and automatically reconnect on connection failures

### Requirement 12: ULIP Data Synchronization

**User Story:** As a logistics coordinator, I want real-time data synchronization with ULIP, so that all stakeholders have consistent visibility into container movements.

#### Acceptance Criteria

1. WHEN a container tracking event occurs, THE System SHALL publish the event to ULIP within 30 seconds
2. WHEN vessel arrival data is updated, THE System SHALL synchronize the updates to ULIP's vessel tracking module
3. THE System SHALL subscribe to ULIP's event streams for port operations, rail movements, and road transport updates
4. WHEN receiving data from ULIP, THE System SHALL validate the data format against ULIP's schema specifications
5. THE System SHALL handle data conflicts by implementing ULIP's conflict resolution protocols with timestamp-based precedence

### Requirement 13: Port Community System Integration via ULIP

**User Story:** As a port operations manager, I want the system to integrate with Port Community Systems through ULIP, so that we can access real-time port operations data.

#### Acceptance Criteria

1. THE System SHALL connect to major Indian Port Community Systems (Mumbai, Chennai, Kolkata, Visakhapatnam) via ULIP's port integration layer
2. WHEN a vessel berths at port, THE System SHALL receive berthing notifications from the Port Community System through ULIP
3. WHEN container gate-in or gate-out events occur, THE System SHALL receive notifications via ULIP within 5 minutes
4. THE System SHALL query port capacity and congestion data from ULIP's port module for slot planning
5. THE System SHALL publish container pickup requests to Port Community Systems via ULIP's standardized messaging format

### Requirement 14: CONCOR Rail Integration via ULIP

**User Story:** As a transport coordinator, I want seamless integration with CONCOR's rail network through ULIP, so that I can book and track rail transport efficiently.

#### Acceptance Criteria

1. THE System SHALL access CONCOR's rail capacity and schedule data via ULIP's rail transport module
2. WHEN a rail slot is auctioned and assigned, THE System SHALL create a booking request in CONCOR's system through ULIP APIs
3. THE System SHALL receive real-time rail wagon tracking updates from CONCOR via ULIP's tracking interface
4. WHEN rail delays or disruptions occur, THE System SHALL receive notifications from CONCOR through ULIP within 15 minutes
5. THE System SHALL query available rail routes and transit times from ULIP's rail network graph

### Requirement 15: Road Transport Integration via ULIP

**User Story:** As a transport coordinator, I want integration with road transport providers through ULIP, so that I can manage last-mile delivery efficiently.

#### Acceptance Criteria

1. THE System SHALL access registered truck fleet availability via ULIP's road transport module
2. WHEN a truck slot is assigned, THE System SHALL create a transport order with the fleet operator through ULIP's booking API
3. THE System SHALL receive GPS-based truck location updates via ULIP's vehicle tracking interface
4. THE System SHALL access FASTag toll data from ULIP to track truck movements on national highways
5. WHEN trucks reach warehouse destinations, THE System SHALL receive delivery confirmation via ULIP within 10 minutes

### Requirement 16: Customs and Regulatory Integration via ULIP

**User Story:** As a compliance officer, I want integration with customs and regulatory systems through ULIP, so that we can ensure regulatory compliance and reduce clearance delays.

#### Acceptance Criteria

1. THE System SHALL access customs clearance status for containers via ULIP's customs integration module
2. WHEN customs clearance is completed, THE System SHALL receive notifications through ULIP and update container status
3. THE System SHALL submit required regulatory documents to customs via ULIP's document exchange interface
4. THE System SHALL access ICEGATE (Indian Customs EDI Gateway) data through ULIP for import/export documentation
5. WHEN regulatory holds are placed on containers, THE System SHALL receive alerts via ULIP and flag affected containers

### Requirement 17: ULIP Data Standards Compliance

**User Story:** As a data engineer, I want the system to comply with ULIP's data standards, so that our data is interoperable with all ULIP-connected systems.

#### Acceptance Criteria

1. THE System SHALL format all container identifiers according to ISO 6346 standard as required by ULIP
2. THE System SHALL use ULIP's standardized location codes (UN/LOCODE) for all port, rail terminal, and warehouse locations
3. THE System SHALL encode timestamps in ISO 8601 format with Indian Standard Time (IST) timezone
4. THE System SHALL implement ULIP's standardized event taxonomy for all tracking events
5. WHEN transmitting data to ULIP, THE System SHALL validate all payloads against ULIP's published JSON schemas

### Requirement 18: ULIP Analytics and Reporting Integration

**User Story:** As a business analyst, I want to leverage ULIP's analytics capabilities, so that I can benchmark our performance against national logistics metrics.

#### Acceptance Criteria

1. THE System SHALL publish performance metrics to ULIP's analytics module including transit times, demurrage costs, and slot utilization
2. THE System SHALL access ULIP's national logistics dashboard data for benchmarking and comparison
3. WHEN generating reports, THE System SHALL include ULIP-sourced data on national average transit times and costs
4. THE System SHALL subscribe to ULIP's predictive analytics feeds for demand forecasting and capacity planning
5. THE System SHALL contribute anonymized operational data to ULIP's national logistics intelligence platform

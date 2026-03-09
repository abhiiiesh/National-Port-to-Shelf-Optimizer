# National Port-to-Shelf Optimizer

A multimodal AI coordination system that synchronizes BCSL vessel arrivals with India's domestic rail (CONCOR) and road networks, integrated with ULIP (Unified Logistics Interface Platform).

## Architecture

This is a TypeScript-based microservices architecture with the following services:

- **API Gateway**: Entry point for all external requests
- **Authentication Service**: User authentication and authorization
- **Vessel Tracking Service**: Tracks vessel positions and arrivals
- **Container Tracking Service**: Manages container lifecycle across transport modes
- **AI Prediction Service**: Generates vessel arrival predictions
- **Auction Service**: Manages slot auctions and bidding
- **Slot Management Service**: Manages transport capacity and reservations
- **ULIP Integration Service**: Integrates with India's ULIP platform

## Project Structure

```
port-to-shelf-optimizer/
├── packages/
│   └── shared-types/          # Shared TypeScript types and interfaces
├── services/
│   ├── api-gateway/
│   ├── authentication/
│   ├── vessel-tracking/
│   ├── container-tracking/
│   ├── ai-prediction/
│   ├── auction/
│   ├── slot-management/
│   └── ulip-integration/
├── docker-compose.yml         # Local development infrastructure
├── package.json               # Root workspace configuration
└── tsconfig.json              # TypeScript configuration
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local Infrastructure

Start PostgreSQL, Redis, and Kafka using Docker Compose:

```bash
npm run dev
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Kafka on port 9092
- Zookeeper on port 2181

### 3. Build All Services

```bash
npm run build
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only property-based tests
npm run test:property
```

## Development

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Type Checking

```bash
npm run typecheck
```

## Testing Strategy

The project uses a dual testing approach:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions using Jest
- **Property-Based Tests**: Verify universal properties across all inputs using fast-check

All property tests reference their corresponding design document properties and validate specific requirements.


## Documentation

- OpenAPI spec: `docs/api/openapi.yaml`
- Authentication flow: `docs/api/authentication-flow.md`
- API examples: `docs/api/examples.md`
- Kubernetes deployment: `docs/deployment/k8s/README.md`
- CI/CD pipeline notes: `docs/deployment/ci-cd.md`

## Infrastructure

### Docker Compose Services

- **PostgreSQL**: Primary database with PostGIS extension
- **Redis**: Caching layer
- **Kafka**: Event bus for asynchronous communication
- **Zookeeper**: Kafka coordination

### Stopping Infrastructure

```bash
npm run dev:down
```

## License

Proprietary

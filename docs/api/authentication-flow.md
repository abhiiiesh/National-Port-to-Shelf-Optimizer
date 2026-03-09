# Authentication Flow

The API Gateway enforces Bearer token authentication on all `/api/v1/*` routes.

## Sequence

1. Client authenticates against the Authentication Service and receives a JWT.
2. Client sends `Authorization: Bearer <token>` on API requests.
3. API Gateway validates token through `/auth/validate` on the configured auth service.
4. Gateway forwards authorized requests to local handlers or downstream services.
5. Invalid/missing tokens return `401` with standardized `ErrorResponse`.

## Roles

Expected roles include:
- `RETAILER`
- `PORT_OPERATOR`
- `TRANSPORT_COORDINATOR`
- `SYSTEM_ADMINISTRATOR`

Role enforcement is applied by service-level authorization logic.

## Example

```bash
curl -X GET "http://localhost:3000/api/v1/vessels" \
  -H "Authorization: Bearer <jwt-token>"
```

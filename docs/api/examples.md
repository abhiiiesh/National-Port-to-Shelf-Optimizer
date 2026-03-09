# API Examples

## Register Vessel

```bash
curl -X POST "http://localhost:3000/api/v1/vessels" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "V1",
    "imoNumber": "1234567",
    "name": "MV Logistics"
  }'
```

## Create Container

```bash
curl -X POST "http://localhost:3000/api/v1/containers" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ABCD1234567",
    "ownerId": "retailer-1",
    "vesselId": "V1",
    "destinationWarehouse": "INDEL"
  }'
```

## Submit Auction Bid

```bash
curl -X POST "http://localhost:3000/api/v1/auctions/A1/bids" \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "slot-1",
    "containerId": "ABCD1234567",
    "bidAmount": 500
  }'
```

## Get Metrics Report

```bash
curl -X GET "http://localhost:3000/api/v1/metrics/performance" \
  -H "Authorization: Bearer <jwt-token>"
```

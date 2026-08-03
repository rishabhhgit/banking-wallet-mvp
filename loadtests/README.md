# Load Tests

This directory contains k6 load tests for the Banking/Wallet System.

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Running Tests

### Start the API

```bash
# From project root
docker-compose up -d postgres redis
npm run db:seed
npm run dev
```

### Run the Load Test

```bash
# Basic run
k6 run loadtests/transfers.js

# With custom API URL
API_URL=http://localhost:8000 k6 run loadtests/transfers.js

# With JSON output
k6 run --out json=loadtest-results.json loadtests/transfers.js

# With summary
k6 run --summary-export=loadtest-summary.json loadtests/transfers.js
```

## Test Scenarios

### transfers.js

Simulates concurrent money transfers between accounts:

- **Ramp up**: 0 → 10 VUs over 10s
- **Sustained load**: 50 VUs for 1 minute
- **Ramp down**: 50 → 0 VUs over 10s
- **Transfer types**: 50% cross-user, 50% same-user
- **Amount range**: $1 - $50
- **Idempotency**: Each request has a unique key

### Custom Metrics

| Metric | Description |
|--------|-------------|
| `transfer_success` | Count of successful transfers |
| `transfer_failed` | Count of failed transfers |
| `insufficient_funds` | Count of insufficient funds errors |
| `transfer_duration` | Transfer request duration trend |
| `success_rate` | Percentage of successful transfers |

### Thresholds

- **95th percentile latency**: < 2000ms
- **Success rate**: > 80%
- **Transfer failures**: < 100

## Interpreting Results

```
     ✓ transfer status is 201
     ✓ transfer has id

     checks.........................: 100.00% ✓ 1000       ✗ 0
     data_received.................: 1.2 MB  19 kB/s
     data_sent.....................: 890 kB  14 kB/s
     http_req_blocked..............: avg=1.2ms    min=0s      med=0s      max=150ms   p(90)=0s      p(95)=0s
     http_req_connecting...........: avg=500µs    min=0s      med=0s      max=50ms    p(90)=0s      p(95)=0s
     http_req_duration.............: avg=150ms    min=20ms    med=120ms   max=2s      p(90)=300ms   p(95)=500ms
     http_req_failed...............: 0.00%       ✓ 0         ✗ 500
     http_req_receiving............: avg=5ms      min=1ms     med=3ms     max=20ms    p(90)=10ms    p(95)=15ms
     http_req_sending..............: avg=1ms      min=0s      med=1ms     max=5ms     p(90)=2ms     p(95)=3ms
     http_req_tls_handshaking......: avg=0s       min=0s      med=0s      max=0s      p(90)=0s      p(95)=0s
     http_req_waiting..............: avg=144ms    min=18ms    med=115ms   max=1.9s    p(90)=280ms   p(95)=480ms
     http_reqs.....................: 500     7.949841/s
     iteration_duration............: avg=200ms    min=50ms    med=180ms   max=3s      p(90)=400ms   p(95)=600ms
     iterations....................: 500     7.949841/s
     success_rate..................: 100.00% ✓ 500         ✗ 0
     transfer_duration.............: avg=150ms    min=20ms    med=120ms   max=2s      p(90)=300ms   p(95)=500ms
     transfer_failed...............: 0       ✓ 0           ✗ 500
     transfer_success..............: 500     ✓ 500         ✗ 0
     vus...........................: 50      max=50
     vus_max.......................: 50      max=50
```

Key things to look for:
- `success_rate`: Should be > 80%
- `http_req_duration` p(95): Should be < 2000ms
- `transfer_failed`: Should be < 100
- `http_req_failed`: Should be 0% (auth failures)

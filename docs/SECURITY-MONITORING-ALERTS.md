# Security Monitoring & Real-time Alerts

**Date:** 2025-11-17
**Version:** 1.0
**Status:** ✅ Session 86 - Production Hardening 10/10

---

## Overview

Comprehensive real-time security monitoring and alerting system for Cartae Marketplace API.

**Monitoring Stack:**

- **Prometheus** - Metrics collection
- **Grafana** - Visualization & dashboards
- **Loki** - Log aggregation
- **Alertmanager** - Alert routing & notifications
- **Fail2ban** - Automated IP blocking
- **SOAR** - Security Orchestration, Automation, and Response

---

## 📊 Metrics & KPIs

### 1. Security Metrics

#### Rate Limiting

```promql
# Rate limit violations per minute
rate(http_requests_rate_limited_total[1m])

# Alert when > 100 violations/minute
alert: HighRateLimitViolations
expr: rate(http_requests_rate_limited_total[1m]) > 100
for: 5m
severity: warning
```

#### Authentication

```promql
# Failed login attempts per minute
rate(http_auth_failed_total[1m])

# Alert when > 10 failed logins/minute
alert: BruteForceAttack
expr: rate(http_auth_failed_total[1m]) > 10
for: 2m
severity: critical
```

#### Admin Operations

```promql
# Admin operations per hour
rate(http_admin_operations_total[1h])

# Alert when > 100 admin ops/hour (unusual activity)
alert: SuspiciousAdminActivity
expr: rate(http_admin_operations_total[1h]) > 100
for: 10m
severity: warning
```

### 2. Application Metrics

#### Error Rate

```promql
# 5xx errors per minute
rate(http_requests_total{status=~"5.."}[1m])

# Alert when > 1% error rate
alert: HighErrorRate
expr: (
  rate(http_requests_total{status=~"5.."}[5m])
  /
  rate(http_requests_total[5m])
) > 0.01
for: 5m
severity: critical
```

#### Response Time

```promql
# P99 response time
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Alert when P99 > 2 seconds
alert: SlowResponseTime
expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 10m
severity: warning
```

### 3. Infrastructure Metrics

#### CPU Usage

```promql
# CPU usage per container
container_cpu_usage_seconds_total

# Alert when > 80% CPU
alert: HighCPUUsage
expr: (
  rate(container_cpu_usage_seconds_total[5m]) * 100
) > 80
for: 10m
severity: warning
```

#### Memory Usage

```promql
# Memory usage per container
container_memory_usage_bytes

# Alert when > 90% memory
alert: HighMemoryUsage
expr: (
  container_memory_usage_bytes
  /
  container_spec_memory_limit_bytes
) > 0.9
for: 10m
severity: critical
```

#### Disk Usage

```promql
# Disk usage
node_filesystem_avail_bytes{mountpoint="/"}

# Alert when < 10% free space
alert: LowDiskSpace
expr: (
  node_filesystem_avail_bytes{mountpoint="/"}
  /
  node_filesystem_size_bytes{mountpoint="/"}
) < 0.1
for: 5m
severity: critical
```

---

## 🚨 Alert Rules

### Critical Alerts (Immediate Response)

#### 1. Brute Force Attack

```yaml
- alert: BruteForceAttack
  expr: rate(http_auth_failed_total[1m]) > 10
  for: 2m
  labels:
    severity: critical
    category: security
  annotations:
    summary: 'Brute force attack detected'
    description: '{{ $value }} failed login attempts per minute from IP {{ $labels.ip }}'
    action: 'Automatic IP block via Fail2ban'
    runbook: 'https://docs.cartae.com/security/brute-force'
```

**Automated Response:**

1. Block IP via Fail2ban (immediate)
2. Alert security team (Slack + Email)
3. Log to SIEM for forensics
4. Increase rate limiting for 1 hour

#### 2. SQL Injection Attempt

```yaml
- alert: SQLInjectionAttempt
  expr: increase(http_requests_suspicious_total{attack_type="sql_injection"}[5m]) > 0
  for: 1m
  labels:
    severity: critical
    category: security
  annotations:
    summary: 'SQL injection attempt detected'
    description: 'Suspicious SQL patterns in request from IP {{ $labels.ip }}'
    action: 'Block IP, alert security team'
    runbook: 'https://docs.cartae.com/security/sql-injection'
```

**Automated Response:**

1. Block IP immediately
2. Alert security team
3. Capture full request for forensics
4. Review related requests from same IP

#### 3. Unauthorized Admin Access

```yaml
- alert: UnauthorizedAdminAccess
  expr: increase(http_requests_total{path=~"/api/v1/admin/.*",status="401"}[5m]) > 5
  for: 2m
  labels:
    severity: critical
    category: security
  annotations:
    summary: 'Multiple unauthorized admin access attempts'
    description: '{{ $value }} failed admin access attempts from IP {{ $labels.ip }}'
    action: 'Block IP, escalate to security'
    runbook: 'https://docs.cartae.com/security/admin-access'
```

**Automated Response:**

1. Block IP for 24 hours
2. Alert security team + management
3. Review audit logs for pattern
4. Verify admin accounts not compromised

### Warning Alerts (Review Within 1 Hour)

#### 4. High Rate Limit Violations

```yaml
- alert: HighRateLimitViolations
  expr: rate(http_requests_rate_limited_total[5m]) > 50
  for: 10m
  labels:
    severity: warning
    category: security
  annotations:
    summary: 'High rate of rate limit violations'
    description: '{{ $value }} rate limit violations per minute'
    action: 'Review logs, consider tightening limits'
```

#### 5. Unusual API Usage Pattern

```yaml
- alert: UnusualAPIUsage
  expr: (
    rate(http_requests_total[1h]) > 1000
  ) AND (
    hour() >= 2 AND hour() <= 6
  )
  for: 30m
  labels:
    severity: warning
    category: security
  annotations:
    summary: "Unusual API usage during off-hours"
    description: "High API traffic at {{ $labels.hour }}:00 (typically low)"
    action: "Review logs for suspicious activity"
```

#### 6. Certificate Expiring Soon

```yaml
- alert: CertificateExpiringSoon
  expr: (ssl_certificate_expiry_seconds < 604800) # 7 days
  for: 1h
  labels:
    severity: warning
    category: infrastructure
  annotations:
    summary: 'TLS certificate expiring soon'
    description: 'Certificate for {{ $labels.domain }} expires in {{ $value }} seconds'
    action: "Renew certificate via Let's Encrypt"
```

---

## 📈 Grafana Dashboards

### Dashboard 1: Security Overview

**Panels:**

1. **Rate Limit Violations** (Time series)
2. **Failed Login Attempts** (Time series)
3. **Admin Operations** (Time series)
4. **Top 10 Blocked IPs** (Table)
5. **Attack Types Distribution** (Pie chart)
6. **OWASP Top 10 Coverage** (Gauge)

**Refresh:** 10 seconds
**URL:** `https://grafana.cartae.com/d/security-overview`

### Dashboard 2: API Performance

**Panels:**

1. **Requests per Second** (Time series)
2. **P50/P95/P99 Latency** (Time series)
3. **Error Rate** (Time series)
4. **Status Code Distribution** (Bar chart)
5. **Endpoint Performance** (Heatmap)
6. **Cache Hit Rate** (Gauge)

**Refresh:** 5 seconds
**URL:** `https://grafana.cartae.com/d/api-performance`

### Dashboard 3: Infrastructure Health

**Panels:**

1. **CPU Usage** (Time series)
2. **Memory Usage** (Time series)
3. **Disk I/O** (Time series)
4. **Network Traffic** (Time series)
5. **Container Status** (Table)
6. **Service Uptime** (Stat)

**Refresh:** 30 seconds
**URL:** `https://grafana.cartae.com/d/infrastructure-health`

---

## 🔔 Notification Channels

### Slack Integration

```yaml
slack:
  - name: 'cartae-security-alerts'
    webhook_url: '${SLACK_WEBHOOK_SECURITY}'
    channel: '#security-alerts'
    username: 'Cartae Security Bot'
    icon_emoji: ':shield:'
    title: '{{ .GroupLabels.alertname }}'
    text: |-
      {{ range .Alerts }}
        *Alert:* {{ .Annotations.summary }}
        *Severity:* {{ .Labels.severity }}
        *Description:* {{ .Annotations.description }}
        *Action:* {{ .Annotations.action }}
        *Runbook:* {{ .Annotations.runbook }}
      {{ end }}
```

### Email Integration

```yaml
email:
  - name: 'security-team'
    to: 'security@cartae.com'
    from: 'alerts@cartae.com'
    smarthost: 'smtp.sendgrid.net:587'
    auth_username: '${SENDGRID_USERNAME}'
    auth_password: '${SENDGRID_API_KEY}'
    headers:
      Subject: '[{{ .GroupLabels.severity }}] {{ .GroupLabels.alertname }}'
```

### PagerDuty Integration (Critical Only)

```yaml
pagerduty:
  - name: 'on-call-engineer'
    service_key: '${PAGERDUTY_SERVICE_KEY}'
    severity_matchers:
      - severity="critical"
```

---

## 🤖 Automated Response Actions

### Fail2ban Integration

**Configuration:** `infrastructure/fail2ban/jail.local`

```ini
[cartae-api-auth]
enabled = true
port = http,https
filter = cartae-api-auth
logpath = /var/log/cartae/api.log
maxretry = 5
findtime = 300  # 5 minutes
bantime = 900   # 15 minutes
action = iptables-multiport[name=cartae-api-auth, port="http,https"]
         sendmail-whois[name=cartae-api-auth, dest=security@cartae.com]
```

**Filter:** `infrastructure/fail2ban/filter.d/cartae-api-auth.conf`

```ini
[Definition]
failregex = ^.*"event":"auth\.login\.failed".*"ip":"<HOST>".*$
            ^.*"event":"admin\.operation\.unauthorized".*"ip":"<HOST>".*$
ignoreregex =
```

### SOAR Automation

**Script:** `infrastructure/security-ops/auto-responder.js`

```typescript
// Auto-block suspicious IPs
async function handleBruteForceAlert(alert) {
  const ip = alert.labels.ip;

  // 1. Block IP via iptables
  await execAsync(`iptables -A INPUT -s ${ip} -j DROP`);

  // 2. Add to Cloudflare WAF blocklist
  await cloudflare.waf.blockIP(ip);

  // 3. Log to SIEM
  await siem.log({
    type: 'auto-response',
    action: 'ip-blocked',
    ip,
    reason: 'brute-force-attack',
    timestamp: new Date().toISOString(),
  });

  // 4. Alert security team
  await slack.send({
    channel: '#security-alerts',
    text: `🚨 Automatically blocked IP ${ip} due to brute force attack`,
  });
}

// Auto-scale on high load
async function handleHighLoadAlert(alert) {
  const currentReplicas = await kubernetes.getReplicaCount('api');

  // Scale up by 50%
  const targetReplicas = Math.ceil(currentReplicas * 1.5);
  await kubernetes.scale('api', targetReplicas);

  await slack.send({
    channel: '#ops',
    text: `📈 Auto-scaled API from ${currentReplicas} to ${targetReplicas} replicas`,
  });
}
```

---

## 📝 Audit Log Analysis

### Log Aggregation (Loki)

**Query Examples:**

```logql
# All failed admin operations in last hour
{job="api"} |= "admin.operation" | json | status != "200" | __timestamp__ > ago(1h)

# Top 10 IPs by rate limit violations
topk(10, sum by (ip) (rate({job="api"} |= "RATE_LIMIT_EXCEEDED" [1h])))

# SQL injection attempts
{job="api"} |= "sql_injection" | json | severity="critical"

# Geographic distribution of traffic
sum by (country) (count_over_time({job="api"} | json | __timestamp__ > ago(24h)))
```

### Anomaly Detection

**Machine Learning Model:** Isolation Forest

```python
# Detect anomalies in API traffic
from sklearn.ensemble import IsolationForest

# Features: requests/min, error_rate, avg_latency, unique_ips
X = load_metrics_last_30_days()

model = IsolationForest(contamination=0.01)  # 1% outliers
model.fit(X)

# Predict current minute
current_metrics = get_current_metrics()
is_anomaly = model.predict([current_metrics])

if is_anomaly == -1:  # Outlier detected
    alert_security_team("Anomalous API traffic detected")
```

---

## 🎯 SLOs & SLIs

### Service Level Objectives

| SLO                | Target           | Measurement                                               |
| ------------------ | ---------------- | --------------------------------------------------------- |
| Availability       | 99.9%            | `(uptime / total_time) * 100`                             |
| Latency (P99)      | < 500ms          | `histogram_quantile(0.99, http_request_duration_seconds)` |
| Error Rate         | < 0.1%           | `(5xx_requests / total_requests) * 100`                   |
| Security Incidents | 0 critical/month | Manual review of incidents                                |

### Error Budget

```yaml
# 99.9% uptime = 43.2 minutes downtime per month
error_budget_minutes: 43.2
current_downtime_minutes: 12.5  # (from monitoring)
remaining_budget: 30.7 minutes

# Burn rate alert
alert: ErrorBudgetBurnRateHigh
expr: (
  error_budget_minutes - current_downtime_minutes
) < (error_budget_minutes * 0.25)  # Less than 25% budget remaining
severity: warning
```

---

## 🔄 Incident Response Workflow

### 1. Alert Triggered

- Alertmanager sends notification
- Security team notified (Slack + Email)
- On-call engineer paged (if critical)

### 2. Initial Triage

- Review alert details in Grafana
- Check audit logs in Loki
- Verify attack pattern

### 3. Containment

- Auto-block IP (if applicable)
- Scale resources (if performance issue)
- Isolate affected services (if breach)

### 4. Investigation

- Review full audit trail
- Identify root cause
- Document findings

### 5. Remediation

- Implement fix
- Deploy to production
- Verify resolution

### 6. Post-Mortem

- Write incident report
- Update runbooks
- Improve detection rules

---

## 📚 Runbooks

### Runbook: Brute Force Attack

**URL:** `https://docs.cartae.com/security/brute-force`

**Steps:**

1. Verify attack in Grafana (failed logins > 10/min)
2. Identify attacker IP from audit logs
3. Confirm auto-block via Fail2ban
4. Review if attack is distributed (multiple IPs)
5. If distributed, enable stricter rate limits
6. Monitor for 24 hours
7. Write post-mortem if significant

### Runbook: Certificate Expiry

**URL:** `https://docs.cartae.com/infra/certificate-renewal`

**Steps:**

1. Check certificate expiry date: `openssl s_client -connect api.cartae.com:443 | openssl x509 -noout -dates`
2. Renew via Let's Encrypt: `certbot renew --force-renewal`
3. Reload Traefik: `docker-compose -f infrastructure/traefik/docker-compose.yml restart`
4. Verify new certificate: `curl -vI https://api.cartae.com`
5. Update monitoring to suppress alert

---

## ✅ Checklist

### Daily

- [ ] Review Grafana dashboards (5 min)
- [ ] Check for critical alerts (Slack)
- [ ] Review audit log summary

### Weekly

- [ ] Analyze top blocked IPs
- [ ] Review error budget burn rate
- [ ] Update Fail2ban rules if needed

### Monthly

- [ ] Security incident review
- [ ] SLO compliance check
- [ ] Update threat intelligence feeds
- [ ] Penetration testing (if scheduled)

### Quarterly

- [ ] Full security audit
- [ ] Update alert thresholds based on traffic
- [ ] Review and update runbooks
- [ ] Disaster recovery drill

---

**Status:** ✅ Production Ready
**Next Review:** 2025-12-17
**Owner:** Security Team

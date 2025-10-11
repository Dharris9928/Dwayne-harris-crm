# Security Operations Runbook

## Overview
This document outlines security procedures, incident response protocols, and operational guidelines for the Nest Pro CRM system.

## Table of Contents
1. [Email Domain Management](#email-domain-management)
2. [User Access Management](#user-access-management)
3. [Security Incident Response](#security-incident-response)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Data Protection](#data-protection)
6. [Regular Maintenance](#regular-maintenance)

---

## Email Domain Management

### Adding a New Authorized Domain

**Who can perform:** Admin users only

**Steps:**
1. Navigate to Settings → Security → Allowed Email Domains
2. Click "Add Domain"
3. Enter domain name (without @ symbol)
4. Select domain type (Business/Partner/Contractor)
5. Add optional notes explaining authorization
6. Click "Add Domain"
7. Click "Verify" button to validate MX records
8. Monitor blocked signup attempts to ensure no legitimate users are blocked

**Validation:**
- Domain must have valid MX records
- Domain must not be a known disposable email service
- Verification status should show "verified" within 24 hours

### Removing an Authorized Domain

**When to remove:**
- Business relationship terminated
- Domain no longer in use
- Security breach at partner organization
- Request from legal/compliance

**Steps:**
1. Navigate to Settings → Security → Allowed Email Domains
2. Locate domain in the list
3. Review current users from this domain:
   ```sql
   SELECT email, first_name, last_name, approval_status 
   FROM auth.users au 
   JOIN profiles p ON au.id = p.id 
   WHERE email LIKE '%@domain.com'
   ```
4. Consider freezing users before removing domain
5. Click "Delete" button
6. Confirm removal
7. Document reason in security log

**Post-removal actions:**
- Notify affected users via email
- Review and close any deletion requests from that domain
- Monitor for unauthorized access attempts

### Monthly Domain Re-verification

**Schedule:** 1st of each month, automated via cron job

**What it checks:**
- MX record validity
- Domain DNS configuration
- Disposable email service status

**Manual re-verification:**
1. Navigate to Settings → Security → Allowed Email Domains
2. Click "Verify" next to each domain
3. Review verification status column
4. Address any failed verifications within 24 hours

**Troubleshooting failed verification:**
- Check if domain DNS has changed
- Verify domain is still actively used
- Contact domain administrator if MX records missing
- Consider temporary deactivation if verification fails for 7+ days

---

## User Access Management

### Approving New User Requests

**Trigger:** Admin receives notification when new user signs up

**Steps:**
1. Navigate to Settings → Security → User Management
2. Review pending approval requests
3. Verify user information:
   - Email domain is authorized
   - Name matches expected format
   - No duplicate accounts exist
4. Check with hiring manager/team lead if uncertain
5. Set appropriate role: Admin / Sales Manager / Sales Rep / Read Only
6. Click "Approve" or "Reject"
7. User receives automated notification of decision

**Approval criteria:**
- Valid email from authorized domain
- Legitimate business need for access
- Proper authorization from manager
- No security red flags

### Freezing User Accounts

**When to freeze:**
- Employee departure
- Security investigation
- Extended leave (>90 days)
- Suspicious activity detected

**Steps:**
1. Navigate to Settings → Security → User Management
2. Locate user account
3. Click "Freeze Account"
4. Enter reason for freeze
5. Confirm freeze action
6. User loses immediate access
7. Data remains intact for audit purposes

**Automated freezes:**
- 90 days after role expiration (if set)
- Bulk contact access alerts (50+ contacts in 10 minutes)

### Departing Employees

**Checklist:**
1. **Immediate actions (within 24 hours):**
   - [ ] Freeze user account
   - [ ] Review recent activity logs
   - [ ] Check for bulk exports/downloads
   - [ ] Verify no shared credentials

2. **Within 1 week:**
   - [ ] Transfer ownership of records to manager
   - [ ] Archive user's communications
   - [ ] Update assigned contacts/companies
   - [ ] Remove from email distribution lists

3. **Within 30 days:**
   - [ ] Full access audit review
   - [ ] Permanent account deactivation (if appropriate)
   - [ ] Data anonymization (if required by policy)

---

## Security Incident Response

### Types of Incidents

#### 1. Unauthorized Access Attempt
**Indicators:**
- Multiple failed login attempts
- Access from unusual IP addresses
- Signup attempts from blocked domains

**Response:**
1. Check blocked signup logs for patterns
2. Review failed login attempts in auth logs
3. If pattern detected, implement temporary IP block
4. Notify security team if persistent
5. Consider adding domain to block list if disposable email detected

#### 2. Bulk Data Access Alert
**Indicators:**
- Alert triggered: User accessed 50+ contacts in 10 minutes
- Large export operations
- Unusual API activity

**Response:**
1. Navigate to Settings → Security → Contact Access Logs
2. Review flagged user's activity
3. Contact user's manager immediately
4. If suspicious:
   - Freeze account immediately
   - Review all exports from past 30 days
   - Determine if data breach occurred
   - Notify legal/compliance if needed
5. If legitimate (e.g., planned migration):
   - Mark alert as reviewed
   - Document business justification
   - No further action needed

#### 3. Unauthorized Domain Signup
**Indicators:**
- Blocked signup attempt logged
- Domain not in authorized list
- Possible phishing attempt

**Response:**
1. Review blocked signup details
2. Check if legitimate business need (e.g., new partner)
3. If legitimate:
   - Obtain proper authorization
   - Add domain following approval process
   - Notify user to retry signup
4. If suspicious:
   - Document in security log
   - Monitor for repeat attempts
   - Report to security team if persistent

#### 4. Encryption System Failure
**Indicators:**
- Decryption errors in logs
- Encryption audit failures
- Key rotation issues

**Response:**
1. **CRITICAL:** Do not delete encryption keys
2. Check encryption audit logs in Settings → Security → Encryption
3. Verify encryption_config has active key version
4. Test decryption with sample record
5. If key lost:
   - Contact technical support immediately
   - Do NOT attempt migration without key
   - Encrypted data may be unrecoverable
6. Monitor migration progress if in-flight

---

## Monitoring & Alerts

### Daily Monitoring Tasks

**Security Dashboard Review (10 minutes):**
1. Navigate to Settings → Security
2. Check unreviewed bulk access alerts
3. Review expired role assignments
4. Check frozen account list
5. Verify no pending approval requests >24 hours old

### Weekly Monitoring Tasks

**Activity Audit (30 minutes):**
1. Review contact access logs for anomalies
2. Check import/export activity logs
3. Review approval audit trail
4. Verify all alerts have been addressed
5. Check encryption system health

### Monthly Monitoring Tasks

**Comprehensive Security Audit (2 hours):**
1. Review all domain verifications
2. Audit user role assignments
3. Check data retention compliance
4. Review rate limiting effectiveness
5. Test incident response procedures
6. Update security documentation
7. Review and update disposable email list

### Alert Thresholds

| Alert Type | Threshold | Action Required |
|------------|-----------|-----------------|
| Bulk Contact Access | 50+ contacts in 10 min | Immediate investigation |
| Failed Login Attempts | 5 per hour per user | Review account security |
| Blocked Signups | 10+ from same domain | Consider domain block |
| Export Operations | 500+ records | Manager notification |
| Encryption Errors | Any occurrence | Immediate technical review |

---

## Data Protection

### Contact Data Encryption

**Current Status:** 
- Encryption system active
- Contact email, phone, mobile fields encrypted
- AES-256 encryption algorithm
- Key version: Check in Settings → Encryption

**Encryption Migration:**
- Batch size: 100 contacts per run
- Progress tracked in encryption_audit_log
- Can be paused and resumed
- Do NOT run multiple migrations simultaneously

**Troubleshooting:**
1. Stuck at low percentage: Check encryption key is set
2. Decryption errors: Verify key version matches
3. Migration failures: Review encryption_audit_log for details

### Data Retention

**Current Policies:**
| Data Type | Retention Period | Action After Expiration |
|-----------|------------------|------------------------|
| Contact Access Logs | 90 days | Auto-deleted |
| Approval Audit Logs | 365 days | Auto-deleted |
| Import/Export Logs | 90 days | Auto-deleted |
| Blocked Signup Attempts | 180 days | Auto-deleted |
| Encryption Audit Logs | Indefinite | Manual review required |

**Manual Cleanup:**
```sql
-- Run this query to check what will be deleted
SELECT table_name, COUNT(*) 
FROM (
  SELECT 'contact_access_logs' as table_name FROM contact_access_logs WHERE accessed_at < now() - interval '90 days'
  UNION ALL
  SELECT 'approval_audit_log' FROM approval_audit_log WHERE created_at < now() - interval '365 days'
) subquery
GROUP BY table_name;
```

### IP Address Anonymization

**Schedule:** Automatic after 30 days

**What it does:**
- Anonymizes last octet of IPv4 addresses (e.g., 192.168.1.100 → 192.168.1.0)
- Preserves general location data for security analysis
- Complies with privacy regulations

**Manual anonymization:**
- Navigate to Settings → Security → Advanced
- Run IP anonymization function
- Review anonymization audit log

---

## Regular Maintenance

### Daily Tasks (5 minutes)
- [ ] Check security dashboard for new alerts
- [ ] Review overnight blocked signup attempts
- [ ] Verify no critical notifications

### Weekly Tasks (30 minutes)
- [ ] Review bulk access alerts
- [ ] Audit new user approvals
- [ ] Check encryption system status
- [ ] Review contact access patterns

### Monthly Tasks (2 hours)
- [ ] Domain re-verification (automated, verify completion)
- [ ] Comprehensive access audit
- [ ] Update disposable email list
- [ ] Test incident response procedures
- [ ] Review and update this runbook
- [ ] Security metrics reporting

### Quarterly Tasks (4 hours)
- [ ] Full security audit by external team
- [ ] Penetration testing (if applicable)
- [ ] Review and update RLS policies
- [ ] Disaster recovery drill
- [ ] Update security training materials

---

## Contacts & Escalation

### Security Incident Escalation Path

**Level 1 - Admin User:**
- Handle routine approvals
- Review daily alerts
- Perform standard user management

**Level 2 - Security Lead:**
- Investigate bulk access alerts
- Handle account freezes
- Coordinate incident response

**Level 3 - Technical Leadership:**
- Database security issues
- Encryption system failures
- Critical system vulnerabilities

**Level 4 - Executive/Legal:**
- Data breaches
- Legal compliance issues
- Major security incidents

### Support Resources

- **Technical Support:** [Contact method]
- **Security Team:** [Contact method]
- **Legal/Compliance:** [Contact method]
- **Emergency Hotline:** [Phone number]

---

## Appendix

### Common SQL Queries

**Find users from specific domain:**
```sql
SELECT au.email, p.first_name, p.last_name, p.approval_status, ur.role
FROM auth.users au
JOIN profiles p ON au.id = p.id
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE au.email LIKE '%@domain.com';
```

**Check recent bulk access patterns:**
```sql
SELECT user_id, COUNT(DISTINCT contact_id) as contact_count, 
       MIN(accessed_at) as first_access, MAX(accessed_at) as last_access
FROM contact_access_logs
WHERE accessed_at > now() - interval '1 hour'
GROUP BY user_id
HAVING COUNT(DISTINCT contact_id) > 20
ORDER BY contact_count DESC;
```

**Review blocked signups by domain:**
```sql
SELECT email_domain, COUNT(*) as attempt_count, 
       MAX(attempted_at) as last_attempt,
       array_agg(DISTINCT blocked_reason) as reasons
FROM blocked_signup_attempts
WHERE attempted_at > now() - interval '7 days'
GROUP BY email_domain
ORDER BY attempt_count DESC;
```

### Compliance Checklist

- [ ] GDPR compliance (if applicable)
- [ ] SOC 2 requirements (if applicable)
- [ ] Industry-specific regulations
- [ ] Data retention policies followed
- [ ] User consent documented
- [ ] Right to deletion honored
- [ ] Data portability supported
- [ ] Audit trails complete

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-10  
**Next Review Date:** 2025-04-10  
**Document Owner:** Security Team

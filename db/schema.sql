-- AR Collections schema (Neon Postgres 16)
-- Idempotent: safe to run multiple times on a fresh or existing database.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bump updatedat only when row data changes (excluding updatedat itself).
CREATE OR REPLACE FUNCTION set_updatedat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW IS DISTINCT FROM OLD THEN
    NEW.updatedat = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Attach updatedat trigger once per table (no DROP/CREATE churn on re-apply).
CREATE OR REPLACE FUNCTION ensure_updatedat_trigger(p_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_trigger text := 'tr_' || p_table || '_updatedat';
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = p_table
      AND t.tgname = v_trigger
      AND NOT t.tgisinternal
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updatedat()',
      v_trigger,
      p_table
    );
  END IF;
END;
$$;

-- Invoice and dunning sequence must belong to the same organization.
CREATE OR REPLACE FUNCTION check_invoicesequence_org_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM invoices i
    JOIN dunningsequences d ON d.id = NEW.sequenceid
    WHERE i.id = NEW.invoiceid
      AND i.orgid = d.orgid
  ) THEN
    RAISE EXCEPTION 'invoicesequences: sequence must belong to the invoice organization';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_invoicesequence_org_trigger()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass('public.invoicesequences') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'invoicesequences'
      AND t.tgname = 'tr_invoicesequences_org_consistency'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER tr_invoicesequences_org_consistency
      BEFORE INSERT OR UPDATE OF invoiceid, sequenceid
      ON invoicesequences
      FOR EACH ROW
      EXECUTE FUNCTION check_invoicesequence_org_consistency();
  END IF;
END;
$$;

-- When invoiceid is set, orgid must match the parent invoice (activitylog only).
CREATE OR REPLACE FUNCTION check_activitylog_invoice_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoiceid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM invoices i
    WHERE i.id = NEW.invoiceid
      AND i.orgid = NEW.orgid
  ) THEN
    RAISE EXCEPTION 'activitylog: orgid does not match invoice orgid';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_activitylog_org_trigger()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass('public.activitylog') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'activitylog'
      AND t.tgname = 'tr_activitylog_invoice_org'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER tr_activitylog_invoice_org
      BEFORE INSERT OR UPDATE OF orgid, invoiceid
      ON activitylog
      FOR EACH ROW
      EXECUTE FUNCTION check_activitylog_invoice_org();
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. users (private credentials — API-only access)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext NOT NULL,
  passwordhash    text NOT NULL,
  fullname        text,
  emailverifiedat timestamptz,
  tokenversion    integer NOT NULL DEFAULT 0,
  createdat       timestamptz NOT NULL DEFAULT now(),
  updatedat       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_tokenversion_check CHECK (tokenversion >= 0)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS tokenversion integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. organizations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  gstin        text,
  udyamnumber  text,
  upivpa       text,
  address      jsonb,
  logourl      text,
  createdat    timestamptz NOT NULL DEFAULT now(),
  updatedat    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. orgmembers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orgmembers (
  orgid     uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  userid    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role      text NOT NULL,
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (orgid, userid),
  CONSTRAINT orgmembers_role_check CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX IF NOT EXISTS idx_orgmembers_userid ON orgmembers (userid);

-- ---------------------------------------------------------------------------
-- 4. refreshtokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refreshtokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tokenhash  text NOT NULL,
  familyid   uuid NOT NULL DEFAULT gen_random_uuid(),
  expiresat  timestamptz NOT NULL,
  revokedat  timestamptz,
  useragent  text,
  ip         inet,
  createdat  timestamptz NOT NULL DEFAULT now(),
  updatedat  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refreshtokens_tokenhash_key UNIQUE (tokenhash),
  CONSTRAINT refreshtokens_expires_after_create CHECK (expiresat > createdat)
);

ALTER TABLE refreshtokens ADD COLUMN IF NOT EXISTS familyid uuid;
UPDATE refreshtokens SET familyid = gen_random_uuid() WHERE familyid IS NULL;
ALTER TABLE refreshtokens ALTER COLUMN familyid SET NOT NULL;
ALTER TABLE refreshtokens ALTER COLUMN familyid SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_refreshtokens_userid ON refreshtokens (userid);
CREATE INDEX IF NOT EXISTS idx_refreshtokens_familyid ON refreshtokens (familyid);

-- ---------------------------------------------------------------------------
-- verificationtokens (email verify + password reset — single-use, hashed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verificationtokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tokenhash  text NOT NULL,
  type       text NOT NULL,
  expiresat  timestamptz NOT NULL,
  usedat     timestamptz,
  createdat  timestamptz NOT NULL DEFAULT now(),
  updatedat  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verificationtokens_tokenhash_key UNIQUE (tokenhash),
  CONSTRAINT verificationtokens_type_check CHECK (type IN ('email_verify', 'password_reset')),
  CONSTRAINT verificationtokens_expires_after_create CHECK (expiresat > createdat)
);

CREATE INDEX IF NOT EXISTS idx_verificationtokens_userid ON verificationtokens (userid);
CREATE INDEX IF NOT EXISTS idx_verificationtokens_active
  ON verificationtokens (userid, type)
  WHERE usedat IS NULL;

-- ---------------------------------------------------------------------------
-- 5. customers (debtors)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgid             uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name              text NOT NULL,
  email             text,
  phone             text,
  whatsappphone     text,
  gstin             text,
  billingaddress    jsonb,
  notes             text,
  preferredchannel  text NOT NULL DEFAULT 'both',
  createdat         timestamptz NOT NULL DEFAULT now(),
  updatedat         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_orgid_id_key UNIQUE (orgid, id),
  CONSTRAINT customers_preferredchannel_check
    CHECK (preferredchannel IN ('email', 'whatsapp', 'both'))
);

CREATE INDEX IF NOT EXISTS idx_customers_orgid ON customers (orgid);

-- ---------------------------------------------------------------------------
-- 6. invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgid                 uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  customerid            uuid NOT NULL,
  invoicenumber         text NOT NULL,
  issuedate             date NOT NULL,
  duedate               date NOT NULL,
  amount                numeric(14, 2) NOT NULL,
  taxamount             numeric(14, 2) NOT NULL DEFAULT 0,
  amountpaid            numeric(14, 2) NOT NULL DEFAULT 0,
  status                text NOT NULL DEFAULT 'draft',
  currency              text NOT NULL DEFAULT 'INR',
  lineitems             jsonb,
  pdfurl                text,
  publictoken           text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  ismsmesupplier        boolean NOT NULL DEFAULT false,
  msmeagreementexists   boolean NOT NULL DEFAULT false,
  createdat             timestamptz NOT NULL DEFAULT now(),
  updatedat             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_orgid_invoicenumber_key UNIQUE (orgid, invoicenumber),
  CONSTRAINT invoices_orgid_id_key UNIQUE (orgid, id),
  CONSTRAINT invoices_customer_org_fkey
    FOREIGN KEY (orgid, customerid) REFERENCES customers (orgid, id) ON DELETE RESTRICT,
  CONSTRAINT invoices_amount_check CHECK (amount >= 0),
  CONSTRAINT invoices_taxamount_check CHECK (taxamount >= 0),
  CONSTRAINT invoices_amountpaid_check CHECK (amountpaid >= 0),
  CONSTRAINT invoices_amountpaid_total_check
    CHECK (amountpaid <= amount + taxamount),
  CONSTRAINT invoices_duedate_check CHECK (duedate >= issuedate),
  CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'partiallypaid', 'paid', 'writtenoff')),
  CONSTRAINT invoices_publictoken_key UNIQUE (publictoken)
);

CREATE INDEX IF NOT EXISTS idx_invoices_orgid_status ON invoices (orgid, status);
CREATE INDEX IF NOT EXISTS idx_invoices_orgid_duedate ON invoices (orgid, duedate);
CREATE INDEX IF NOT EXISTS idx_invoices_customerid ON invoices (customerid);

-- ---------------------------------------------------------------------------
-- 7. dunningsequences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dunningsequences (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgid      uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  name       text NOT NULL,
  isdefault  boolean NOT NULL DEFAULT false,
  steps      jsonb NOT NULL DEFAULT '[]'::jsonb,
  createdat  timestamptz NOT NULL DEFAULT now(),
  updatedat  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dunningsequences_orgid_id_key UNIQUE (orgid, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dunningsequences_one_default_per_org
  ON dunningsequences (orgid)
  WHERE isdefault = true;

-- ---------------------------------------------------------------------------
-- 8. invoicesequences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoicesequences (
  invoiceid       uuid PRIMARY KEY REFERENCES invoices (id) ON DELETE CASCADE,
  sequenceid      uuid NOT NULL REFERENCES dunningsequences (id) ON DELETE RESTRICT,
  paused          boolean NOT NULL DEFAULT false,
  nextstepindex   integer NOT NULL DEFAULT 0,
  nextrunat       timestamptz,
  createdat       timestamptz NOT NULL DEFAULT now(),
  updatedat       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoicesequences_nextstepindex_check CHECK (nextstepindex >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoicesequences_nextrunat_active
  ON invoicesequences (nextrunat)
  WHERE paused = false;

-- ---------------------------------------------------------------------------
-- 9. reminderslog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminderslog (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoiceid           uuid NOT NULL,
  orgid               uuid NOT NULL,
  channel             text NOT NULL,
  template            text NOT NULL,
  status              text NOT NULL,
  providermessageid   text,
  error               text,
  sentat              timestamptz,
  createdat           timestamptz NOT NULL DEFAULT now(),
  updatedat           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reminderslog_invoice_org_fkey
    FOREIGN KEY (orgid, invoiceid) REFERENCES invoices (orgid, id) ON DELETE RESTRICT,
  CONSTRAINT reminderslog_status_check
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_reminderslog_invoiceid ON reminderslog (invoiceid);

-- ---------------------------------------------------------------------------
-- 10. paymentlinks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paymentlinks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgid                 uuid NOT NULL,
  invoiceid             uuid NOT NULL,
  gateway               text NOT NULL,
  url                   text NOT NULL,
  providerreferenceid   text,
  amount                numeric(14, 2) NOT NULL,
  status                text NOT NULL DEFAULT 'active',
  expiresat             timestamptz,
  paidat                timestamptz,
  createdat             timestamptz NOT NULL DEFAULT now(),
  updatedat             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paymentlinks_invoice_org_fkey
    FOREIGN KEY (orgid, invoiceid) REFERENCES invoices (orgid, id) ON DELETE CASCADE,
  CONSTRAINT paymentlinks_gateway_check CHECK (gateway IN ('upi', 'razorpay')),
  CONSTRAINT paymentlinks_status_check CHECK (status IN ('active', 'paid', 'expired')),
  CONSTRAINT paymentlinks_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_paymentlinks_invoiceid ON paymentlinks (invoiceid);

-- ---------------------------------------------------------------------------
-- 11. payments (immutable financial records — never cascade-delete)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgid               uuid NOT NULL,
  invoiceid           uuid NOT NULL,
  amount              numeric(14, 2) NOT NULL,
  method              text,
  providerpaymentid   text,
  rawwebhook          jsonb,
  receivedat          timestamptz NOT NULL DEFAULT now(),
  createdat           timestamptz NOT NULL DEFAULT now(),
  updatedat           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_invoice_org_fkey
    FOREIGN KEY (orgid, invoiceid) REFERENCES invoices (orgid, id) ON DELETE RESTRICT,
  CONSTRAINT payments_amount_check CHECK (amount > 0),
  CONSTRAINT payments_providerpaymentid_key UNIQUE (providerpaymentid)
);

CREATE INDEX IF NOT EXISTS idx_payments_invoiceid ON payments (invoiceid);

-- ---------------------------------------------------------------------------
-- 12. promisestopay
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promisestopay (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoiceid       uuid NOT NULL,
  orgid           uuid NOT NULL,
  promiseddate    date NOT NULL,
  promisedamount  numeric(14, 2) NOT NULL,
  note            text,
  kept            boolean,
  createdat       timestamptz NOT NULL DEFAULT now(),
  updatedat       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promisestopay_invoice_org_fkey
    FOREIGN KEY (orgid, invoiceid) REFERENCES invoices (orgid, id) ON DELETE RESTRICT,
  CONSTRAINT promisestopay_promisedamount_check CHECK (promisedamount > 0)
);

CREATE INDEX IF NOT EXISTS idx_promisestopay_invoiceid ON promisestopay (invoiceid);

-- ---------------------------------------------------------------------------
-- 13. activitylog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activitylog (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgid      uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  invoiceid  uuid REFERENCES invoices (id) ON DELETE SET NULL,
  actor      text NOT NULL,
  type       text NOT NULL,
  payload    jsonb,
  createdat  timestamptz NOT NULL DEFAULT now(),
  updatedat  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activitylog_orgid_createdat
  ON activitylog (orgid, createdat DESC);

CREATE INDEX IF NOT EXISTS idx_activitylog_invoiceid
  ON activitylog (invoiceid)
  WHERE invoiceid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 14. subscriptions (platform billing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgid                     uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  plan                      text NOT NULL DEFAULT 'free',
  status                    text NOT NULL DEFAULT 'active',
  razorpaysubscriptionid    text,
  currentperiodend          timestamptz,
  createdat                 timestamptz NOT NULL DEFAULT now(),
  updatedat                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_orgid_key UNIQUE (orgid),
  CONSTRAINT subscriptions_plan_check CHECK (plan IN ('free', 'pro', 'business')),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'pastdue', 'canceled'))
);

-- ---------------------------------------------------------------------------
-- 15. aiusage (per-org daily AI quota)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aiusage (
  orgid      uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  usagedate  date NOT NULL DEFAULT CURRENT_DATE,
  count      integer NOT NULL DEFAULT 0,
  createdat  timestamptz NOT NULL DEFAULT now(),
  updatedat  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (orgid, usagedate),
  CONSTRAINT aiusage_count_check CHECK (count >= 0)
);

-- ---------------------------------------------------------------------------
-- 16. webhookevents (idempotency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhookevents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     text NOT NULL,
  eventid      text NOT NULL,
  payload      jsonb NOT NULL,
  processedat  timestamptz,
  createdat    timestamptz NOT NULL DEFAULT now(),
  updatedat    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhookevents_eventid_key UNIQUE (eventid)
);

CREATE INDEX IF NOT EXISTS idx_webhookevents_unprocessed
  ON webhookevents (createdat)
  WHERE processedat IS NULL;

-- ---------------------------------------------------------------------------
-- Triggers (idempotent attach)
-- ---------------------------------------------------------------------------
SELECT ensure_updatedat_trigger('users');
SELECT ensure_updatedat_trigger('organizations');
SELECT ensure_updatedat_trigger('orgmembers');
SELECT ensure_updatedat_trigger('refreshtokens');
SELECT ensure_updatedat_trigger('verificationtokens');
SELECT ensure_updatedat_trigger('customers');
SELECT ensure_updatedat_trigger('invoices');
SELECT ensure_updatedat_trigger('dunningsequences');
SELECT ensure_updatedat_trigger('invoicesequences');
SELECT ensure_updatedat_trigger('reminderslog');
SELECT ensure_updatedat_trigger('paymentlinks');
SELECT ensure_updatedat_trigger('payments');
SELECT ensure_updatedat_trigger('promisestopay');
SELECT ensure_updatedat_trigger('activitylog');
SELECT ensure_updatedat_trigger('subscriptions');
SELECT ensure_updatedat_trigger('aiusage');
SELECT ensure_updatedat_trigger('webhookevents');

SELECT ensure_invoicesequence_org_trigger();
SELECT ensure_activitylog_org_trigger();

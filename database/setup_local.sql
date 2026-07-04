-- =============================================================================
--  VETERINARIA SAAS — Script PostgreSQL Local
--  Versión: 2.0 (Plan Unificado Pro)
--  Generado: 2026-07-01
--
--  Instrucciones:
--    1. Crear la base de datos (una sola vez):
--         psql -U postgres -c "CREATE DATABASE veterinaria_db;"
--
--    2. Ejecutar este script:
--         psql -U postgres -d veterinaria_db -f setup_local.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTENSIONES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";


-- ---------------------------------------------------------------------------
-- 2. LIMPIAR OBJETOS EXISTENTES (orden inverso de dependencias)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS registro_integridad_certificados  CASCADE;
DROP TABLE IF EXISTS certificados_vacunacion            CASCADE;
DROP TABLE IF EXISTS perfiles_veterinarios              CASCADE;
DROP TABLE IF EXISTS ticket_items                       CASCADE;
DROP TABLE IF EXISTS tickets                            CASCADE;
DROP TABLE IF EXISTS medical_attentions                 CASCADE;
DROP TABLE IF EXISTS digital_certificates               CASCADE;
DROP TABLE IF EXISTS vaccinations                       CASCADE;
DROP TABLE IF EXISTS clinical_records                   CASCADE;
DROP TABLE IF EXISTS appointments                       CASCADE;
DROP TABLE IF EXISTS patients                           CASCADE;
DROP TABLE IF EXISTS owners                             CASCADE;
DROP TABLE IF EXISTS services                           CASCADE;
DROP TABLE IF EXISTS users                              CASCADE;
DROP TABLE IF EXISTS organizations                      CASCADE;

DROP FUNCTION IF EXISTS fn_update_updated_at()          CASCADE;
DROP FUNCTION IF EXISTS fn_auto_ticket_number()         CASCADE;
DROP FUNCTION IF EXISTS fn_calc_ticket_item_subtotal()  CASCADE;
DROP FUNCTION IF EXISTS fn_update_ticket_total()        CASCADE;
DROP FUNCTION IF EXISTS fn_vaccination_sign_check()     CASCADE;

DROP VIEW IF EXISTS v_patients_full      CASCADE;
DROP VIEW IF EXISTS v_revenue_today      CASCADE;
DROP VIEW IF EXISTS v_upcoming_vaccines  CASCADE;


-- ===========================================================================
-- 3. TABLAS PRINCIPALES
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- organizations — Clínicas veterinarias (tenants del SaaS)
-- ---------------------------------------------------------------------------
CREATE TABLE organizations (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255)  NOT NULL UNIQUE,
    slug                VARCHAR(100)  NOT NULL UNIQUE,
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,

    -- Integración WhatsApp (Evolution API)
    evolution_api_url   VARCHAR(500),
    evolution_api_key   VARCHAR(500),
    evolution_instance  VARCHAR(255),

    -- Integración OpenAI
    openai_api_key      VARCHAR(500),

    -- Google Calendar
    google_calendar_id  VARCHAR(255),

    -- Identidad visual y firma profesional
    firma_png_url       VARCHAR(1000),
    sello_png_url       VARCHAR(1000),
    color_principal     VARCHAR(20),
    color_secundario    VARCHAR(20),

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  organizations IS 'Tenants del SaaS. Cada fila es una clínica veterinaria.';
COMMENT ON COLUMN organizations.slug IS 'Identificador URL-safe único, ej: veterinaria-mendoza';


-- ---------------------------------------------------------------------------
-- users — Veterinarios y administradores por organización
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(500)  NOT NULL,
    org_id          INTEGER       REFERENCES organizations(id) ON DELETE SET NULL,
    is_admin        BOOLEAN       NOT NULL DEFAULT FALSE,
    is_superadmin   BOOLEAN       NOT NULL DEFAULT FALSE,

    -- Perfil profesional
    full_name       VARCHAR(255),
    license_number  VARCHAR(100),    -- Matrícula / Número de registro
    signature_img   VARCHAR(1000),   -- URL imagen de firma digital
    stamp_img       VARCHAR(1000),   -- URL imagen de sello profesional

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN users.is_superadmin IS 'TRUE solo para el dueño del SaaS. Acceso a /superadmin.';


-- ---------------------------------------------------------------------------
-- services — Catálogo de servicios y precios por organización
-- ---------------------------------------------------------------------------
CREATE TABLE services (
    id          SERIAL PRIMARY KEY,
    org_id      INTEGER       NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        VARCHAR(255)  NOT NULL,
    price       NUMERIC(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    category    VARCHAR(100)  NOT NULL DEFAULT 'General',

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE services IS 'El bot WhatsApp consulta esta tabla para responder preguntas de precios.';


-- ---------------------------------------------------------------------------
-- owners — Dueños/tutores de mascotas
-- ---------------------------------------------------------------------------
CREATE TABLE owners (
    id              SERIAL PRIMARY KEY,
    org_id          INTEGER      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number    VARCHAR(30)  NOT NULL,
    name            VARCHAR(255),

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_org_phone UNIQUE (org_id, phone_number)
);

COMMENT ON COLUMN owners.phone_number IS 'Formato E.164, ej: 5491134567890';


-- ---------------------------------------------------------------------------
-- patients — Mascotas / pacientes
-- ---------------------------------------------------------------------------
CREATE TABLE patients (
    id                   SERIAL PRIMARY KEY,
    org_id               INTEGER       NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id             INTEGER       NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    name                 VARCHAR(255)  NOT NULL,
    species              VARCHAR(100)  NOT NULL DEFAULT 'Canino',
    breed                VARCHAR(150),
    birth_date           DATE,
    weight               NUMERIC(6,2),   -- kg
    height               NUMERIC(6,2),   -- cm
    sex                  VARCHAR(10),    -- Macho / Hembra
    medical_history_link VARCHAR(1000),  -- Link externo opcional

    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_org_owner_patient UNIQUE (org_id, owner_id, name)
);


-- ---------------------------------------------------------------------------
-- clinical_records — Historia clínica
-- ---------------------------------------------------------------------------
CREATE TABLE clinical_records (
    id          SERIAL PRIMARY KEY,
    org_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    date        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    vet_name    VARCHAR(255),

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- vaccinations — Vacunas aplicadas
-- ---------------------------------------------------------------------------
CREATE TABLE vaccinations (
    id                SERIAL PRIMARY KEY,
    org_id            INTEGER      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id        INTEGER      NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vaccine_name      VARCHAR(255) NOT NULL,
    date_administered TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    next_dose_date    TIMESTAMP WITH TIME ZONE,
    batch_number      VARCHAR(100),

    -- Firma digital profesional
    is_signed         BOOLEAN      NOT NULL DEFAULT FALSE,
    signed_at         TIMESTAMP WITH TIME ZONE,
    signature_hash    VARCHAR(500),
    signature_data    TEXT,
    vet_stamp         TEXT,

    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- digital_certificates — PDFs generados y almacenados
-- ---------------------------------------------------------------------------
CREATE TABLE digital_certificates (
    id           SERIAL PRIMARY KEY,
    org_id       INTEGER      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id   INTEGER      NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    file_hash    VARCHAR(64)  NOT NULL UNIQUE,
    storage_path VARCHAR(1000) NOT NULL,
    is_valid     BOOLEAN      NOT NULL DEFAULT TRUE,

    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- appointments — Citas agendadas
-- ---------------------------------------------------------------------------
CREATE TABLE appointments (
    id          SERIAL PRIMARY KEY,
    org_id      INTEGER      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id    INTEGER      NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    pet_name    VARCHAR(255) NOT NULL,
    reason      VARCHAR(500),
    date        TIMESTAMP WITH TIME ZONE NOT NULL,
    status      VARCHAR(30)  NOT NULL DEFAULT 'confirmed',

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_appointment_status CHECK (
        status IN ('confirmed', 'waiting', 'attended', 'cancelled')
    )
);


-- ---------------------------------------------------------------------------
-- medical_attentions — Consultas médicas en curso
-- ---------------------------------------------------------------------------
CREATE TABLE medical_attentions (
    id          SERIAL PRIMARY KEY,
    org_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vet_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status      VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    start_date  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date    TIMESTAMP WITH TIME ZONE,
    notes       TEXT,

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_attention_status CHECK (
        status IN ('in_progress', 'suspended', 'finished')
    )
);


-- ---------------------------------------------------------------------------
-- tickets — Comprobantes de pago
-- ---------------------------------------------------------------------------
CREATE TABLE tickets (
    id              SERIAL PRIMARY KEY,
    attention_id    INTEGER        UNIQUE REFERENCES medical_attentions(id) ON DELETE SET NULL,
    org_id          INTEGER        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ticket_number   VARCHAR(20)    NOT NULL DEFAULT '',
    date            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_amount    NUMERIC(12,2)  NOT NULL DEFAULT 0,
    currency        VARCHAR(10)    NOT NULL DEFAULT 'ARS',
    payment_status  VARCHAR(30)    NOT NULL DEFAULT 'paid',
    payment_method  VARCHAR(100),

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_payment_status CHECK (
        payment_status IN ('pending', 'paid', 'cancelled', 'refunded')
    )
);


-- ---------------------------------------------------------------------------
-- ticket_items — Líneas de detalle del ticket
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_items (
    id          SERIAL PRIMARY KEY,
    ticket_id   INTEGER       NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    description VARCHAR(500)  NOT NULL,
    unit_price  NUMERIC(12,2) NOT NULL,
    quantity    INTEGER       NOT NULL DEFAULT 1,
    subtotal    NUMERIC(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_price_nonnegative CHECK (unit_price >= 0)
);


-- ===========================================================================
-- 4. TABLAS SISTEMA DE CERTIFICADOS AVANZADOS (fpdf2)
-- ===========================================================================

CREATE TABLE perfiles_veterinarios (
    id                    SERIAL PRIMARY KEY,
    nombre_completo       VARCHAR(255) NOT NULL,
    matricula_profesional VARCHAR(100) NOT NULL,
    nombre_veterinaria    VARCHAR(255),
    firma_sello_url       VARCHAR(1000),

    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE certificados_vacunacion (
    id                SERIAL PRIMARY KEY,
    mascota_nombre    VARCHAR(255) NOT NULL,
    mascota_especie   VARCHAR(100),
    dueno_nombre      VARCHAR(255),
    veterinario_id    INTEGER REFERENCES perfiles_veterinarios(id) ON DELETE SET NULL,
    vacunas_json      JSONB        NOT NULL DEFAULT '[]',
    pdf_url           VARCHAR(1000),
    hash_control      VARCHAR(255),
    token_validacion  VARCHAR(255) NOT NULL UNIQUE,

    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE registro_integridad_certificados (
    id             SERIAL PRIMARY KEY,
    certificado_id INTEGER NOT NULL REFERENCES certificados_vacunacion(id) ON DELETE CASCADE,
    hash_pdf       VARCHAR(255) NOT NULL,
    timestamp      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verificado     BOOLEAN NOT NULL DEFAULT TRUE
);


-- ===========================================================================
-- 5. ÍNDICES DE PERFORMANCE
-- ===========================================================================

CREATE INDEX idx_orgs_slug        ON organizations (slug);
CREATE INDEX idx_orgs_active      ON organizations (is_active);
CREATE INDEX idx_users_username   ON users (username);
CREATE INDEX idx_users_org        ON users (org_id);
CREATE INDEX idx_svc_org          ON services (org_id);
CREATE INDEX idx_svc_cat          ON services (org_id, category);
CREATE INDEX idx_owners_org       ON owners (org_id);
CREATE INDEX idx_owners_phone     ON owners (phone_number);
CREATE INDEX idx_pat_org          ON patients (org_id);
CREATE INDEX idx_pat_owner        ON patients (owner_id);
CREATE INDEX idx_pat_name         ON patients (org_id, name);
CREATE INDEX idx_clin_patient     ON clinical_records (patient_id);
CREATE INDEX idx_clin_date        ON clinical_records (patient_id, created_at DESC);
CREATE INDEX idx_vac_patient      ON vaccinations (patient_id);
CREATE INDEX idx_vac_next_dose    ON vaccinations (next_dose_date) WHERE next_dose_date IS NOT NULL;
CREATE INDEX idx_apps_org_status  ON appointments (org_id, status);
CREATE INDEX idx_apps_org_date    ON appointments (org_id, date DESC);
CREATE INDEX idx_att_org_status   ON medical_attentions (org_id, status);
CREATE INDEX idx_att_patient      ON medical_attentions (patient_id);
CREATE INDEX idx_tick_org_date    ON tickets (org_id, date DESC);
CREATE INDEX idx_tick_number      ON tickets (org_id, ticket_number);
CREATE INDEX idx_dcert_hash       ON digital_certificates (file_hash);
CREATE INDEX idx_dcert_patient    ON digital_certificates (patient_id);
CREATE INDEX idx_certvac_token    ON certificados_vacunacion (token_validacion);


-- ===========================================================================
-- 6. FUNCIONES Y TRIGGERS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 6.1 Auto-actualizar updated_at en cada UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'organizations', 'users', 'services', 'owners', 'patients',
        'clinical_records', 'vaccinations', 'appointments',
        'medical_attentions', 'perfiles_veterinarios'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();',
            t, t
        );
    END LOOP;
END; $$;


-- ---------------------------------------------------------------------------
-- 6.2 Auto-numerar tickets por organización (000001, 000002, ...)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_ticket_number()
RETURNS TRIGGER AS $$
DECLARE v_last INTEGER;
BEGIN
    SELECT COALESCE(MAX(ticket_number::INTEGER), 0)
    INTO v_last
    FROM tickets
    WHERE org_id = NEW.org_id
      AND ticket_number ~ '^\d+$';

    NEW.ticket_number = LPAD((v_last + 1)::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_autonumber
    BEFORE INSERT ON tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
    EXECUTE FUNCTION fn_auto_ticket_number();


-- ---------------------------------------------------------------------------
-- 6.3 Auto-calcular subtotal en ticket_items
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calc_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal = NEW.unit_price * NEW.quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_items_subtotal
    BEFORE INSERT OR UPDATE ON ticket_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_calc_subtotal();


-- ---------------------------------------------------------------------------
-- 6.4 Recalcular total del ticket al cambiar sus ítems
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_ticket_total()
RETURNS TRIGGER AS $$
DECLARE v_tid INTEGER; v_total NUMERIC(12,2);
BEGIN
    v_tid := COALESCE(NEW.ticket_id, OLD.ticket_id);
    SELECT COALESCE(SUM(subtotal), 0) INTO v_total
    FROM ticket_items WHERE ticket_id = v_tid;
    UPDATE tickets SET total_amount = v_total WHERE id = v_tid;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_items_update_total
    AFTER INSERT OR UPDATE OR DELETE ON ticket_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_ticket_total();


-- ---------------------------------------------------------------------------
-- 6.5 Auto-establecer signed_at al firmar una vacuna
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_vaccination_sign()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_signed = TRUE AND NEW.signed_at IS NULL THEN
        NEW.signed_at = NOW();
    END IF;
    IF NEW.is_signed = FALSE THEN
        NEW.signed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vaccination_sign
    BEFORE INSERT OR UPDATE ON vaccinations
    FOR EACH ROW
    EXECUTE FUNCTION fn_vaccination_sign();


-- ===========================================================================
-- 7. VISTAS
-- ===========================================================================

CREATE OR REPLACE VIEW v_patients_full AS
SELECT
    p.id            AS patient_id,
    p.org_id,
    p.name          AS patient_name,
    p.species,
    p.breed,
    p.birth_date,
    p.weight,
    p.sex,
    o.id            AS owner_id,
    o.name          AS owner_name,
    o.phone_number  AS owner_phone
FROM patients p
JOIN owners o ON p.owner_id = o.id;

COMMENT ON VIEW v_patients_full IS 'Pacientes con datos de dueño. Útil para listados del panel admin.';


CREATE OR REPLACE VIEW v_revenue_today AS
SELECT
    org_id,
    COUNT(id)         AS tickets_hoy,
    SUM(total_amount) AS ingresos_hoy,
    currency
FROM tickets
WHERE date >= CURRENT_DATE
  AND payment_status = 'paid'
GROUP BY org_id, currency;

COMMENT ON VIEW v_revenue_today IS 'Ingresos del día actual por organización.';


CREATE OR REPLACE VIEW v_upcoming_vaccines AS
SELECT
    v.id            AS vaccination_id,
    v.org_id,
    v.next_dose_date,
    v.vaccine_name,
    p.name          AS patient_name,
    p.species,
    o.name          AS owner_name,
    o.phone_number  AS owner_phone
FROM vaccinations v
JOIN patients p ON v.patient_id = p.id
JOIN owners   o ON p.owner_id   = o.id
WHERE v.next_dose_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
ORDER BY v.next_dose_date ASC;

COMMENT ON VIEW v_upcoming_vaccines IS 'Vacunas con próxima dosis en los siguientes 30 días. Ideal para recordatorios automáticos.';


-- ===========================================================================
-- 8. DATOS INICIALES (SEED)
-- ===========================================================================

INSERT INTO organizations (name, slug, is_active, color_principal, color_secundario)
VALUES ('Veterinaria Demo', 'demo', TRUE, '#6C63FF', '#3ECFCF')
ON CONFLICT (slug) DO NOTHING;


-- ⚠️  CONTRASEÑA INICIAL: SuperAdmin123!@#
-- Hash generado con pbkdf2_sha256 (compatible con passlib Python).
-- Para generar uno nuevo en Python:
--   from passlib.context import CryptContext
--   ctx = CryptContext(schemes=["pbkdf2_sha256"])
--   print(ctx.hash("TuNuevaClave"))
INSERT INTO users (username, password_hash, org_id, is_admin, is_superadmin, full_name)
VALUES (
    'superadmin',
    '$pbkdf2-sha256$29000$N2YzNGZkZGZhYWFhYWFh$wXVi.nNEpvJOkZ5mR3vxMuP8KOtEdWpHHi0s5sFEFrc',
    (SELECT id FROM organizations WHERE slug = 'demo'),
    TRUE,
    TRUE,
    'Super Administrador'
)
ON CONFLICT (username) DO NOTHING;


INSERT INTO services (org_id, name, price, category, description)
SELECT o.id, s.name, s.price, s.category, s.description
FROM organizations o
CROSS JOIN (VALUES
    ('Consulta General',          3500,  'Consultas',    'Consulta clínica estándar'),
    ('Consulta de Urgencia',      6000,  'Consultas',    'Atención urgente fuera de horario'),
    ('Vacuna Antirrábica',        4500,  'Vacunas',      'Vacuna antirrábica anual'),
    ('Vacuna Sextuple Canino',    5500,  'Vacunas',      'Vacuna sextuple con refuerzo anual'),
    ('Vacuna Triple Felino',      4800,  'Vacunas',      'Vacuna triple felina anual'),
    ('Desparasitación Interna',   2200,  'Tratamientos', 'Antiparasitario oral según peso'),
    ('Baño y Peluquería Pequeño', 3000,  'Estética',     'Razas pequeñas hasta 10kg'),
    ('Baño y Peluquería Grande',  5000,  'Estética',     'Razas grandes más de 10kg'),
    ('Castración Macho',         15000,  'Cirugía',      'Orquiectomía canino/felino'),
    ('Castración Hembra',        22000,  'Cirugía',      'Ovariohisterectomía canino/felino'),
    ('Radiografía',               8000,  'Diagnóstico',  'Placa radiográfica simple'),
    ('Ecografía',                12000,  'Diagnóstico',  'Ultrasonido abdominal')
) AS s(name, price, category, description)
WHERE o.slug = 'demo'
ON CONFLICT DO NOTHING;


-- ===========================================================================
-- 9. VERIFICACIÓN FINAL
-- ===========================================================================
DO $$
DECLARE
    v_tables   INTEGER;
    v_triggers INTEGER;
    v_indexes  INTEGER;
    v_views    INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tables   FROM information_schema.tables   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    SELECT COUNT(*) INTO v_triggers FROM information_schema.triggers  WHERE trigger_schema = 'public';
    SELECT COUNT(*) INTO v_indexes  FROM pg_indexes                   WHERE schemaname    = 'public';
    SELECT COUNT(*) INTO v_views    FROM information_schema.views     WHERE table_schema  = 'public';

    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════╗';
    RAISE NOTICE '║   ✅  Veterinaria SaaS — Setup Completado    ║';
    RAISE NOTICE '╠══════════════════════════════════════════════╣';
    RAISE NOTICE '║  📦  Tablas    : %                          ║', LPAD(v_tables::TEXT,   2);
    RAISE NOTICE '║  📐  Vistas    : %                          ║', LPAD(v_views::TEXT,    2);
    RAISE NOTICE '║  ⚡  Triggers  : %                          ║', LPAD(v_triggers::TEXT, 2);
    RAISE NOTICE '║  🔍  Índices   : %                          ║', LPAD(v_indexes::TEXT,  2);
    RAISE NOTICE '╠══════════════════════════════════════════════╣';
    RAISE NOTICE '║  👤  Usuario   : superadmin                  ║';
    RAISE NOTICE '║  🔑  Clave     : SuperAdmin123!@#            ║';
    RAISE NOTICE '║  ⚠️   Cambiar la clave después del login      ║';
    RAISE NOTICE '╚══════════════════════════════════════════════╝';
END; $$;

-- ============================================================================
-- 10-9 · Sistema de Predicciones + XP + Niveles (Fase 1)
-- Implementa Sec 3.1 del documento "Sistema de Niveles y Experiencia".
-- Multiplicadores, rachas y Hall of Fame quedan para fases siguientes.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Cache local de peleas (FK estable, agnóstico al provider)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fights (
    id                      text        PRIMARY KEY,
    provider                text        NOT NULL,
    provider_fight_id       text        NOT NULL,
    event_name              text,
    event_slug              text,
    weight_class            text,
    is_main_event           boolean     NOT NULL DEFAULT false,
    is_ppv                  boolean     NOT NULL DEFAULT false,
    fight_date              timestamptz,

    status                  text        NOT NULL DEFAULT 'scheduled'
                                        CHECK (status IN ('scheduled','finished','cancelled')),

    fighter1_external_id    text,
    fighter1_name           text,
    fighter1_photo          text,
    fighter2_external_id    text,
    fighter2_name           text,
    fighter2_photo          text,

    -- Resultado
    winner_external_id      text,
    result_method           text        CHECK (result_method IN ('ko_tko','submission','decision')),
    result_round            int         CHECK (result_round BETWEEN 1 AND 5),
    resolved_at             timestamptz,
    resolved_by             text        CHECK (resolved_by IN ('api','admin')),

    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    UNIQUE (provider, provider_fight_id)
);

CREATE INDEX IF NOT EXISTS idx_fights_status_date ON public.fights (status, fight_date);
CREATE INDEX IF NOT EXISTS idx_fights_event_slug  ON public.fights (event_slug);

-- ----------------------------------------------------------------------------
-- 2. Predicciones de los usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.predictions (
    id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    fight_id                        text        NOT NULL REFERENCES public.fights(id)   ON DELETE CASCADE,

    predicted_winner_external_id    text        NOT NULL,
    predicted_method                text        CHECK (predicted_method IN ('ko_tko','submission','decision')),
    predicted_round                 int         CHECK (predicted_round BETWEEN 1 AND 5),

    created_at                      timestamptz NOT NULL DEFAULT now(),
    updated_at                      timestamptz NOT NULL DEFAULT now(),

    -- Resolución (se llenan por la función resolve_fight_predictions)
    resolved_at                     timestamptz,
    is_winner_correct               boolean,
    is_method_correct               boolean,
    is_round_correct                boolean,
    xp_awarded                      int         NOT NULL DEFAULT 0,

    UNIQUE (user_id, fight_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_fight ON public.predictions (fight_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user  ON public.predictions (user_id);

-- ----------------------------------------------------------------------------
-- 3. Columnas xp / level en profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp    int NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level int NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------------
-- 4. Función: nivel a partir de XP (curva del PDF, sec 2.1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.level_from_xp(p_xp int)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE
        WHEN p_xp >= 3130 THEN 10
        WHEN p_xp >= 2480 THEN 9
        WHEN p_xp >= 1940 THEN 8
        WHEN p_xp >= 1490 THEN 7
        WHEN p_xp >= 1115 THEN 6
        WHEN p_xp >= 805  THEN 5
        WHEN p_xp >= 545  THEN 4
        WHEN p_xp >= 330  THEN 3
        WHEN p_xp >= 150  THEN 2
        ELSE 1
    END;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Migración de rangos viejos (Novato/Aprendiz/...) a los nuevos del PDF
--    Mapeo 1-a-1 por orden, y se setea xp al umbral mínimo del nuevo nivel.
--
--    Antes del UPDATE: dropear cualquier CHECK constraint que tuviera la lista
--    vieja de rangos, para no chocar al renombrar.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_conname text;
BEGIN
    FOR v_conname IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND contype  = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%rango%'
    LOOP
        EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_conname);
    END LOOP;
END $$;

DO $$
DECLARE
    v_xp_thresholds int[] := ARRAY[0, 150, 330, 545, 805, 1115, 1490, 1940, 2480, 3130];
    v_new_names     text[] := ARRAY['Amateur','Prospecto','Local Card','Co-Main','Main Event',
                                    'Ranked','Top 10','Top 5','Contender','Champion'];
    v_old_names     text[] := ARRAY['Novato','Aprendiz','Luchador','Guerrero','Veterano',
                                    'Experto','Maestro','Leyenda','Campeón','Hall of Fame'];
    i int;
BEGIN
    FOR i IN 1..10 LOOP
        UPDATE public.profiles
           SET rango = v_new_names[i],
               level = i,
               xp    = GREATEST(xp, v_xp_thresholds[i])
         WHERE rango = v_old_names[i];
    END LOOP;
    -- Cualquier perfil con rango null o desconocido → Amateur
    UPDATE public.profiles
       SET rango = 'Amateur', level = 1, xp = COALESCE(xp, 0)
     WHERE rango IS NULL OR rango NOT IN (SELECT unnest(v_new_names));
END $$;

-- Recrear el CHECK con los nombres nuevos
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_rango_check
    CHECK (rango IN (
        'Amateur','Prospecto','Local Card','Co-Main','Main Event',
        'Ranked','Top 10','Top 5','Contender','Champion'
    ));

-- ----------------------------------------------------------------------------
-- 6. Trigger: bloquear predicciones cuando la pelea ya empezó / terminó
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_prediction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_fight public.fights%ROWTYPE;
BEGIN
    SELECT * INTO v_fight FROM public.fights WHERE id = NEW.fight_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pelea % no existe', NEW.fight_id;
    END IF;

    IF v_fight.status <> 'scheduled' THEN
        RAISE EXCEPTION 'No se aceptan predicciones: la pelea no está agendada (status=%)', v_fight.status;
    END IF;

    IF v_fight.fight_date IS NOT NULL AND v_fight.fight_date < now() THEN
        RAISE EXCEPTION 'No se aceptan predicciones: la pelea ya empezó';
    END IF;

    -- Validar que el ganador predicho corresponda a uno de los dos peleadores
    IF NEW.predicted_winner_external_id NOT IN (
        v_fight.fighter1_external_id, v_fight.fighter2_external_id
    ) THEN
        RAISE EXCEPTION 'El ganador predicho no es uno de los peleadores de esta pelea';
    END IF;

    -- Solo se puede predecir round si el método es ko_tko o submission
    IF NEW.predicted_method = 'decision' AND NEW.predicted_round IS NOT NULL THEN
        NEW.predicted_round := NULL;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Se dispara SOLO cuando el usuario crea o cambia su pick. La cláusula `OF`
-- es necesaria: al resolver una pelea, resolve_fight_predictions() actualiza
-- estas mismas filas (aciertos y XP) y, sin acotar las columnas, este trigger
-- volvería a validar contra una pelea ya finalizada y abortaría el cierre con
-- "la pelea no está agendada". Las columnas de resolución no lo disparan.
DROP TRIGGER IF EXISTS trg_validate_prediction ON public.predictions;
CREATE TRIGGER trg_validate_prediction
    BEFORE INSERT OR UPDATE OF
        predicted_winner_external_id, predicted_method, predicted_round
    ON public.predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_prediction();

-- ----------------------------------------------------------------------------
-- 7. Función: resolver predicciones de una pelea + sumar XP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_fight_predictions(p_fight_id text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fight             public.fights%ROWTYPE;
    v_pred              public.predictions%ROWTYPE;
    v_count             int := 0;
    v_winner_correct    boolean;
    v_method_correct    boolean;
    v_round_correct     boolean;
    v_total_xp          int;
    -- XP del PDF sec 3.1
    v_xp_winner constant int := 20;
    v_xp_method constant int := 8;
    v_xp_round  constant int := 12;
BEGIN
    SELECT * INTO v_fight FROM public.fights WHERE id = p_fight_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pelea % no encontrada', p_fight_id;
    END IF;
    IF v_fight.status <> 'finished' THEN
        RAISE EXCEPTION 'La pelea no está finalizada';
    END IF;
    IF v_fight.winner_external_id IS NULL THEN
        RAISE EXCEPTION 'La pelea no tiene ganador registrado';
    END IF;

    FOR v_pred IN
        SELECT * FROM public.predictions
        WHERE fight_id = p_fight_id AND resolved_at IS NULL
    LOOP
        v_winner_correct := v_pred.predicted_winner_external_id = v_fight.winner_external_id;

        v_method_correct := v_winner_correct
            AND v_pred.predicted_method IS NOT NULL
            AND v_fight.result_method IS NOT NULL
            AND v_pred.predicted_method = v_fight.result_method;

        v_round_correct := v_method_correct
            AND v_fight.result_method IN ('ko_tko','submission')
            AND v_pred.predicted_round IS NOT NULL
            AND v_fight.result_round IS NOT NULL
            AND v_pred.predicted_round = v_fight.result_round;

        v_total_xp := 0;
        IF v_winner_correct THEN v_total_xp := v_total_xp + v_xp_winner; END IF;
        IF v_method_correct THEN v_total_xp := v_total_xp + v_xp_method; END IF;
        IF v_round_correct  THEN v_total_xp := v_total_xp + v_xp_round;  END IF;

        UPDATE public.predictions SET
            resolved_at        = now(),
            is_winner_correct  = v_winner_correct,
            is_method_correct  = v_method_correct,
            is_round_correct   = v_round_correct,
            xp_awarded         = v_total_xp
        WHERE id = v_pred.id;

        IF v_total_xp > 0 THEN
            UPDATE public.profiles
               SET xp    = COALESCE(xp, 0) + v_total_xp,
                   level = public.level_from_xp(COALESCE(xp, 0) + v_total_xp)
             WHERE id = v_pred.user_id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Trigger: cuando una pelea se marca como finished + winner, resolver auto
--
--    Son DOS triggers a propósito:
--
--    a) El de updated_at va BEFORE, porque modificar NEW solo tiene efecto ahí.
--
--    b) El de resolución va AFTER, y esto es indispensable: en un trigger
--       BEFORE la fila todavía tiene los valores viejos, y
--       resolve_fight_predictions() relee la pelea desde la tabla. Leería
--       status='scheduled', lanzaría "La pelea no está finalizada" y abortaría
--       el UPDATE entero — o sea, ninguna pelea con predicciones podría
--       cerrarse. Ejecutándolo AFTER, la función ve la fila ya actualizada.
--
--    No hay recursión: resolve_fight_predictions() actualiza community_snapshot
--    sobre esta misma tabla, pero en esa segunda pasada la condición de abajo
--    da falsa (OLD.status ya es 'finished' y el ganador no cambió).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fights_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_resolve_predictions_on_finish()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'finished'
       AND NEW.winner_external_id IS NOT NULL
       AND (
           OLD.status <> 'finished'
           OR OLD.winner_external_id IS NULL
           OR OLD.winner_external_id <> NEW.winner_external_id
       )
    THEN
        PERFORM public.resolve_fight_predictions(NEW.id);
    END IF;
    RETURN NULL; -- AFTER trigger: el valor de retorno se ignora
END;
$$;

DROP TRIGGER IF EXISTS trg_fights_resolve_on_finish ON public.fights;
DROP TRIGGER IF EXISTS trg_fights_touch_updated_at ON public.fights;

CREATE TRIGGER trg_fights_touch_updated_at
    BEFORE UPDATE ON public.fights
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fights_touch_updated_at();

CREATE TRIGGER trg_fights_resolve_on_finish
    AFTER UPDATE ON public.fights
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_resolve_predictions_on_finish();

-- ----------------------------------------------------------------------------
-- 9. Función SECURITY DEFINER para upsert de fights (permite que cualquier
--    usuario autenticado sincronice peleas vistas en la API, pero solo modifica
--    campos seguros, no los de resultado).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_fight_from_provider(
    p_id                    text,
    p_provider              text,
    p_provider_fight_id     text,
    p_event_name            text,
    p_event_slug            text,
    p_weight_class          text,
    p_is_main_event         boolean,
    p_is_ppv                boolean,
    p_fight_date            timestamptz,
    p_status                text,
    p_fighter1_external_id  text,
    p_fighter1_name         text,
    p_fighter1_photo        text,
    p_fighter2_external_id  text,
    p_fighter2_name         text,
    p_fighter2_photo        text,
    p_winner_external_id    text DEFAULT NULL,
    p_result_method         text DEFAULT NULL,
    p_result_round          int  DEFAULT NULL
)
RETURNS public.fights
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.fights%ROWTYPE;
BEGIN
    INSERT INTO public.fights (
        id, provider, provider_fight_id, event_name, event_slug, weight_class,
        is_main_event, is_ppv, fight_date, status,
        fighter1_external_id, fighter1_name, fighter1_photo,
        fighter2_external_id, fighter2_name, fighter2_photo,
        winner_external_id, result_method, result_round,
        resolved_by, resolved_at
    ) VALUES (
        p_id, p_provider, p_provider_fight_id, p_event_name, p_event_slug, p_weight_class,
        p_is_main_event, p_is_ppv, p_fight_date, p_status,
        p_fighter1_external_id, p_fighter1_name, p_fighter1_photo,
        p_fighter2_external_id, p_fighter2_name, p_fighter2_photo,
        p_winner_external_id, p_result_method, p_result_round,
        CASE WHEN p_winner_external_id IS NOT NULL THEN 'api' ELSE NULL END,
        CASE WHEN p_winner_external_id IS NOT NULL THEN now() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
        event_name           = EXCLUDED.event_name,
        event_slug           = EXCLUDED.event_slug,
        weight_class         = EXCLUDED.weight_class,
        is_main_event        = EXCLUDED.is_main_event,
        is_ppv               = EXCLUDED.is_ppv,
        -- La fecha de una pelea ya resuelta por un admin queda congelada. Hace
        -- falta para los datos semilla, cuyas fechas son relativas a "hoy": sin
        -- esto, cada sincronización le correría la fecha a una pelea que ya
        -- terminó, y quedaría "finalizada" con fecha futura.
        fight_date           = CASE
                                  WHEN public.fights.resolved_by = 'admin' THEN public.fights.fight_date
                                  ELSE EXCLUDED.fight_date
                               END,
        fighter1_external_id = EXCLUDED.fighter1_external_id,
        fighter1_name        = EXCLUDED.fighter1_name,
        fighter1_photo       = EXCLUDED.fighter1_photo,
        fighter2_external_id = EXCLUDED.fighter2_external_id,
        fighter2_name        = EXCLUDED.fighter2_name,
        fighter2_photo       = EXCLUDED.fighter2_photo,
        -- status / resultado: solo se actualiza si la API trae uno nuevo Y la fila aún no fue resuelta por admin
        status               = CASE
                                  WHEN public.fights.resolved_by = 'admin' THEN public.fights.status
                                  ELSE EXCLUDED.status
                               END,
        winner_external_id   = CASE
                                  WHEN public.fights.resolved_by = 'admin' THEN public.fights.winner_external_id
                                  WHEN EXCLUDED.winner_external_id IS NOT NULL THEN EXCLUDED.winner_external_id
                                  ELSE public.fights.winner_external_id
                               END,
        result_method        = CASE
                                  WHEN public.fights.resolved_by = 'admin' THEN public.fights.result_method
                                  WHEN EXCLUDED.result_method IS NOT NULL THEN EXCLUDED.result_method
                                  ELSE public.fights.result_method
                               END,
        result_round         = CASE
                                  WHEN public.fights.resolved_by = 'admin' THEN public.fights.result_round
                                  WHEN EXCLUDED.result_round IS NOT NULL THEN EXCLUDED.result_round
                                  ELSE public.fights.result_round
                               END,
        resolved_by          = CASE
                                  WHEN public.fights.resolved_by = 'admin' THEN 'admin'
                                  WHEN EXCLUDED.winner_external_id IS NOT NULL THEN 'api'
                                  ELSE public.fights.resolved_by
                               END,
        resolved_at          = CASE
                                  WHEN public.fights.resolved_by = 'admin' THEN public.fights.resolved_at
                                  WHEN EXCLUDED.winner_external_id IS NOT NULL AND public.fights.resolved_at IS NULL THEN now()
                                  ELSE public.fights.resolved_at
                               END
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. Función SECURITY DEFINER para que el ADMIN resuelva manualmente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_resolve_fight(
    p_fight_id              text,
    p_winner_external_id    text,
    p_result_method         text,
    p_result_round          int DEFAULT NULL
)
RETURNS public.fights
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin boolean;
    v_row public.fights%ROWTYPE;
BEGIN
    SELECT COALESCE(pro, false) INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Solo admins pueden resolver peleas manualmente';
    END IF;

    UPDATE public.fights
       SET status              = 'finished',
           winner_external_id  = p_winner_external_id,
           result_method       = p_result_method,
           result_round        = CASE WHEN p_result_method = 'decision' THEN NULL ELSE p_result_round END,
           resolved_by         = 'admin',
           resolved_at         = now(),
           -- Una pelea que se cierra no puede quedar fechada en el futuro: si
           -- el admin resuelve antes de la fecha prevista (típico al demostrar
           -- con datos semilla), se toma el cierre como el momento del combate.
           fight_date          = CASE
                                    WHEN fight_date IS NULL OR fight_date > now() THEN now()
                                    ELSE fight_date
                                 END
     WHERE id = p_fight_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pelea % no encontrada', p_fight_id;
    END IF;

    RETURN v_row;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. Vista: predictions con datos de pelea (útil para perfil/historial)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.predictions_with_fights;
CREATE VIEW public.predictions_with_fights AS
SELECT
    p.id,
    p.user_id,
    p.fight_id,
    p.predicted_winner_external_id,
    p.predicted_method,
    p.predicted_round,
    p.created_at,
    p.resolved_at,
    p.is_winner_correct,
    p.is_method_correct,
    p.is_round_correct,
    p.xp_awarded,
    f.event_name,
    f.event_slug,
    f.weight_class,
    f.is_main_event,
    f.fight_date,
    f.status                AS fight_status,
    f.fighter1_external_id,
    f.fighter1_name,
    f.fighter1_photo,
    f.fighter2_external_id,
    f.fighter2_name,
    f.fighter2_photo,
    f.winner_external_id    AS actual_winner_external_id,
    f.result_method         AS actual_method,
    f.result_round          AS actual_round
FROM public.predictions p
JOIN public.fights f ON f.id = p.fight_id;

-- ----------------------------------------------------------------------------
-- 12. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.fights      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- fights: lectura pública, escritura solo vía SECURITY DEFINER (no policy de write)
DROP POLICY IF EXISTS "fights_select_all" ON public.fights;
CREATE POLICY "fights_select_all" ON public.fights FOR SELECT USING (true);

-- predictions: cualquiera autenticado puede leer (necesario para % comunidad);
-- solo el dueño puede insertar/actualizar/borrar las suyas.
DROP POLICY IF EXISTS "predictions_select_all" ON public.predictions;
CREATE POLICY "predictions_select_all" ON public.predictions FOR SELECT USING (true);

DROP POLICY IF EXISTS "predictions_insert_own" ON public.predictions;
CREATE POLICY "predictions_insert_own" ON public.predictions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_update_own" ON public.predictions;
CREATE POLICY "predictions_update_own" ON public.predictions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_delete_own" ON public.predictions;
CREATE POLICY "predictions_delete_own" ON public.predictions
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 13. Realtime para predictions (% comunidad en vivo)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'predictions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'fights'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fights;
    END IF;
END $$;

# Code review: Plan 0031 – Arquitectura multi-tenant segura

**Reviewer:** Code review per `commands/code_review.md`  
**Plan:** `docs/features/0031_PLAN.md`  
**Date:** 2025-01-30

---

## 1. Plan implementation

### Fase 1: Capa de datos y tenant

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Tabla `app.tenants` con id, host (único), name, created_at, updated_at | ✅ | `server/src/schema/tenants.ts` – id es text PK (no UUID; se usa `'default'`). |
| `tenant_id` en users, teams, leagues, events (NOT NULL, FK) | ✅ | Schemas y migración `0027_multi_tenant.sql` correctos. |
| Sin `tenant_id` en team_members, team_availability, etc. (aislamiento vía padre) | ✅ | Plan respetado. |
| Migración: crear tenants, añadir columnas, tenant por defecto, NOT NULL, FKs | ✅ | Inserción `('default', 'www.mypadelcenter.com', 'MyPadelCenter')` y updates a `'default'`. |
| users.email único por tenant | ✅ | Constraint `users_tenant_email_unique(tenant_id, email)`; se elimina `users_email_unique`. |
| teams.name único por tenant | ✅ | `teams_tenant_name_unique(tenant_id, name)`; se elimina `teams_name_unique`. |
| leagues / events nombres únicos por tenant | ✅ | Constraints añadidos. |
| teams.passcode | ✅ | Plan deja “decidir”: se mantiene **global** único (`teams_passcode_unique`). Generación de passcode en API scoped por tenant para comprobar colisión dentro del tenant; el constraint global evita duplicados entre tenants. |

### Fase 2: Detección de tenant y middleware

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Resolver tenant desde cabecera Host | ✅ | `server/src/lib/tenant.ts`: `normalizeHost()` (quita puerto), `resolveTenantIdFromHost()` consulta `tenants` por host. |
| Si host no registrado → 403/404, sin tenant por defecto | ✅ | En `auth.ts`, si `!tenantId` se responde 403 (“Tenant not found for this host”). |
| Orden: resolver tenant → auth → validar user.tenant_id === tenant | ✅ | Integrado en `authMiddleware`: primero tenant desde Host, luego auth, luego `user.tenant_id !== tenantId` → 403. |
| `c.set("tenantId", tenantId)` para handlers | ✅ | Tras validar usuario, se hace `c.set("tenantId", tenantId)`. |
| ContextVariableMap con `tenantId: string` | ✅ | Declarado en `middleware/auth.ts`. |
| Aplicar en protected y admin | ✅ | `protectedRoutes` y `adminRoutes` usan `authMiddleware` (y admin además `adminMiddleware`). |

### Fase 3: Aislamiento de queries

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Listados filtrados por `tenant_id` | ✅ | GET leagues, teams, players, events (admin y protected) usan `eq(..., tenant_id, tenantId)`. |
| Operaciones por ID: comprobar `row.tenant_id === c.get("tenantId")` (o 404) | ✅ | Se hace vía `where(and(eq(id, ...), eq(tenant_id, tenantId)))` en loads de league/team/event. |
| INSERT con `tenant_id: c.get("tenantId")` | ✅ | Creación de leagues, teams, events y usuario en auth asignan `tenant_id`. |
| Public GET /leagues y GET /leagues/:id | ✅ | Resuelven tenant con `resolveTenantIdFromHost(host)`; si no hay tenant → 403; list/detail filtrados por `tenant_id`. |

### Fase 4: Auth y registro

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Al crear usuario, asignar `tenant_id` del Host | ✅ | En `auth.ts`, insert de users incluye `tenant_id: tenantId`. |
| Si no hay tenant (host no registrado), no crear usuario y 403 | ✅ | Tenant se resuelve al inicio; si es null no se llega a crear usuario. |
| Admin por tenant | ✅ | `adminMiddleware` solo comprueba `user.role === 'admin'`; el usuario ya está validado por tenant en auth, por tanto el admin es efectivamente por tenant. |

---

## 2. Bugs e incidencias

### 2.1 GET /db-test devuelve usuarios de todos los tenants (seguridad / privacidad)

- **Dónde:** `server/src/api.ts`, ruta `api.get("/db-test", ...)` (aprox. líneas 293–332).
- **Qué hace:** Tras comprobar salud de la BD, ejecuta `db.select().from(schema.users).limit(5)` **sin filtrar por tenant** y devuelve esos usuarios en el JSON.
- **Problema:** Es una ruta pública (sin auth). Según el plan, en rutas públicas que acceden a BD “decidir si se filtra por un tenant por defecto o se deja sin tenant (solo para diagnóstico)”. Dejarlo sin filtrar implica que cualquier cliente puede ver hasta 5 usuarios de cualquier tenant (o mezcla de tenants).
- **Recomendación:**  
  - **Opción A (recomendada):** Resolver tenant con `resolveTenantIdFromHost(c.req.header("Host"))` y filtrar: `.where(eq(users.tenant_id, tenantId))`. Si no hay tenant, no devolver usuarios (o devolver array vacío / 403).  
  - **Opción B:** Mantener el endpoint solo para diagnóstico y no incluir usuarios en la respuesta (p. ej. devolver solo `connectionHealthy`, `message`, `timestamp`).  
  En producción conviene no exponer datos de usuarios en un endpoint público.

---

## 3. Data alignment (snake_case, estructuras)

- **API:** Las respuestas siguen usando nombres de columnas de la BD (snake_case, p. ej. `tenant_id`, `created_at`). No se ha introducido un mapeo a camelCase en esta feature.
- **Frontend:** No se encontraron referencias a `tenant_id` ni `tenantId` en el cliente; el tenant se determina en el servidor vía Host. No hay cambio de contrato para el frontend.
- No se detectaron casos de respuestas anidadas tipo `{ data: { ... } }` que no coincidan con lo que consume el cliente.

---

## 4. Sobreingeniería y tamaño de archivos

- **api.ts:** El archivo tiene más de 4000 líneas y concentra todas las rutas (públicas, protected, admin) y lógica de negocio. El plan 3.3 menciona helpers opcionales tipo `withTenant(db, tenantId)`; no se han añadido y la repetición de `tenantId = c.get("tenantId")` y `and(eq(..., tenant_id, tenantId))` es manejable pero repetitiva.
- **Recomendación a futuro:** Valorar dividir por dominio (p. ej. `routes/leagues.ts`, `routes/teams.ts`, `routes/events.ts`, `routes/users.ts`) y/o un helper que construya condiciones “con tenant” para no duplicar tanto el mismo patrón. No es bloqueante para esta feature.

---

## 5. Estilo y coherencia con el resto del código

- Uso consistente de `c.get("tenantId")` al inicio de los handlers que necesitan tenant.
- Uso uniforme de `and(eq(..., tenantId))` en Drizzle para filtrar por tenant.
- Misma convención de errores (403 para tenant/host no válido, 404 para recurso no encontrado o no perteneciente al tenant).
- No se detectaron construcciones raras ni desvíos de estilo respecto al resto del servidor.

---

## 6. Notas de seguridad (plan)

- **Solo Host para determinar tenant:** Se usa únicamente `c.req.header("Host")` (y `resolveTenantIdFromHost`); no se confía en otros headers para elegir tenant. Correcto.
- **Defensa en profundidad:** Además del middleware, las rutas revisadas incluyen filtro o comprobación de `tenant_id` en las queries de negocio (listados, get-by-id, updates, deletes). Coherente con el plan.

---

## 7. Resumen

| Aspecto | Valoración |
|---------|------------|
| Cumplimiento del plan (Fases 1–4) | Completo; única desviación menor: `tenants.id` es text con valor `'default'` en lugar de UUID. |
| Bugs / riesgos | 1: GET /db-test expone usuarios sin filtro por tenant (recomendado corregir). |
| Data alignment | Sin problemas detectados; frontend no depende de tenant en el payload. |
| Estructura / refactor | api.ts muy grande; refactor opcional a medio plazo. |
| Estilo | Consistente. |

**Acción recomendada:** Corregir GET /db-test para no devolver usuarios sin filtrar por tenant (o no devolver usuarios), según se decida entre uso diagnóstico o público por host.

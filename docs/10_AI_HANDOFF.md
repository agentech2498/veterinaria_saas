# AI HANDOFF - VETERINARIA SaaS

## IMPORTANTE

Antes de realizar cualquier modificación en el proyecto debes leer completamente toda la documentación ubicada en la carpeta `/docs`.

Orden obligatorio de lectura:

1. 00_PROJECT_CONTEXT.md
2. 01_ARCHITECTURE.md
3. 02_TECH_STACK.md
4. 03_CODING_RULES.md
5. 04_MODULES.md
6. 05_API.md
7. 06_DATABASE.md
8. 07_AI_INSTRUCTIONS.md
9. 08_CHANGELOG.md
10. 09_PENDING_TASKS.md

No asumir información que contradiga dicha documentación.

---

# Descripción del Proyecto

Veterinaria SaaS Multi-Tenant.

Sistema orientado a clínicas veterinarias donde cada organización trabaja completamente aislada mediante arquitectura Multi-Tenant.

El sistema posee Backend en FastAPI y Frontend en React + TypeScript + Capacitor.

El Backend es la única fuente de verdad.

---

# Stack Tecnológico

Backend

- FastAPI
- SQLAlchemy Async
- PostgreSQL
- Alembic
- JWT

Frontend

- React 19
- TypeScript
- Vite
- Capacitor
- Axios

Infraestructura

- Docker
- Docker Compose
- Linux VPS
- Coolify

---

# Estado Actual

Actualmente funcionan correctamente:

- Login
- Usuarios
- Roles
- Organizaciones
- Multi-Tenant
- Agenda
- Pacientes
- Propietarios
- Servicios
- Atenciones
- Historia Clínica
- Vacunas
- Caja
- Tickets
- Firma Digital
- Configuración

En desarrollo:

- PDFs avanzados
- Reportes
- Estadísticas
- Performance
- Optimización general

---

# Objetivo Principal

Construir un SaaS profesional para clínicas veterinarias que sea:

- rápido
- seguro
- escalable
- mantenible
- modular
- preparado para crecimiento

---

# Restricciones Obligatorias

NO romper funcionalidades existentes.

NO modificar comportamiento funcional sin autorización.

NO modificar diseño sin autorización.

NO cambiar la lógica de negocio.

NO crear parches.

NO crear hacks.

NO ocultar errores.

NO introducir deuda técnica.

NO eliminar funcionalidades.

NO modificar endpoints públicos salvo necesidad técnica comprobada.

NO cambiar contratos API sin justificación.

---

# Arquitectura Obligatoria

Respetar estrictamente:

- Clean Architecture
- SOLID
- DRY
- KISS
- YAGNI
- Repository Pattern
- Service Layer
- Dependency Injection

---

# Flujo de Trabajo Obligatorio

Toda tarea debe seguir el siguiente proceso:

1.

Auditoría.

↓

2.

Detección de problemas.

↓

3.

Informe técnico.

↓

4.

Esperar aprobación.

↓

5.

Implementación.

↓

6.

Pruebas.

↓

7.

Validación.

↓

8.

Informe final.

Nunca modificar directamente sin haber realizado previamente una auditoría.

---

# Qué debe revisar antes de modificar

Antes de cambiar cualquier archivo verificar:

- dependencias
- arquitectura
- impacto
- regresiones
- compilación
- TypeScript
- FastAPI
- PostgreSQL
- Docker

---

# Qué debe entregar

Siempre entregar:

## Diagnóstico

- Problema encontrado.
- Causa raíz.
- Riesgo.
- Impacto.

## Implementación

- Archivos modificados.
- Justificación técnica.
- Beneficios.

## Validación

- Compilación.
- Pruebas.
- Riesgo de regresión.

---

# Prioridades del Proyecto

Orden de prioridad:

1. Estabilidad.

2. Seguridad.

3. Correctitud funcional.

4. Rendimiento.

5. Escalabilidad.

6. Mantenibilidad.

7. Optimización.

Nunca sacrificar estabilidad por rendimiento.

---

# Regla de Oro

Si existe duda entre realizar una optimización o preservar una funcionalidad existente:

SIEMPRE preservar la funcionalidad.

La optimización nunca debe romper comportamiento existente.

---

# Comunicación

Si detectas un problema importante:

NO corregir automáticamente.

Primero explicar:

- qué ocurre;
- por qué ocurre;
- cómo debería resolverse;
- qué archivos serán modificados;
- qué riesgos existen.

Esperar aprobación antes de implementar.

---

# Objetivo Final

Mantener un código limpio, mantenible, seguro y escalable, evitando deuda técnica y respetando las decisiones arquitectónicas del proyecto.
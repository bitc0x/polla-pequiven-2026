# Polla Pequiven Mundial 2026

La polla oficial del Mundial 2026 (Canadá · México · USA).

48 selecciones. 104 partidos. 12 grupos. Una sola polla.

## Stack

- Next.js 14 (App Router)
- Firebase Realtime Database (shared con fc-friendlies-tracker, data aislada en `polla-pequiven-2026/`)
- Vanilla CSS con design system propio

## Cómo jugar

1. Entrar a la URL.
2. Pegar la clave de jugador.
3. Predecir:
   - Los 72 partidos de fase de grupos (marcador exacto).
   - Las llaves eliminatorias (qué equipos llegan a cada ronda).
   - Predicciones especiales (Campeón, Goleador, etc).
   - Desempate: total de goles del torneo.
4. Las predicciones se cierran al inicio del torneo (11 jun 2026).

## Sistema de puntaje

| Categoría | Puntos |
|---|---|
| Resultado exacto en fase de grupos | 5 |
| Solo ganador correcto (1X2) | 2 |
| Diferencia de goles correcta (bonus) | +1 |
| Equipo correcto en Round of 32 | 3 |
| Equipo correcto en Octavos | 6 |
| Equipo correcto en Cuartos | 12 |
| Equipo correcto en Semis | 25 |
| Equipo correcto en Final | 50 |
| Campeón Mundial | 100 |
| Subcampeón | 40 |
| Tercer Lugar | 25 |
| Bota de Oro / Balón de Oro / Guante de Oro | 30 c/u |
| Mejor Sub-21 | 25 |
| Selección Revelación | 25 |

Desempate: el jugador que más se acerque al total de goles del torneo.

## Admin

El admin tiene un panel separado para meter los resultados reales. Los puntajes se calculan automáticamente en vivo.

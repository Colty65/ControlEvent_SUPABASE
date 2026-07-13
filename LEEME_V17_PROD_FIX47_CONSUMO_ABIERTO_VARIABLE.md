# v21_prod FIX47 - consumo abierto variable

Cambios aplicados sobre FIX46:

1. Planificación inicial reconoce `Asistentes Base`, `Consumo abierto` y `Cena real`.
   - Si el prompt trae `Consumo abierto: 50`, se usa ese dato.
   - Si no lo trae pero el texto describe peña en plaza, gente de paso o invitados, se calcula: `Consumo abierto = Asistentes base + 66%`.
   - Si no se indica cena real, se calcula: `Cena real = Asistentes base / 2`.
   - Si el prompt trae rango, por ejemplo `Cena real: 15-20`, se conserva el rango y se usa el máximo operativo para cálculo.

2. El contexto enviado a Zuzu separa:
   - asistentes base,
   - consumo abierto,
   - cena real,
   - consumo declarado de cerveza/cubatas,
   - consumo de cálculo.

3. Zuzu debe usar consumo abierto para cerveza, refrescos, cubatas, hielo, vasos, aperitivo y menaje; y cena real para barbacoa/cena.

4. El cálculo local de emergencia también usa la misma regla de consumo abierto.

5. La traza añade Base / Consumo abierto / Cena real en la fase de opciones.

Versión visible: `v21_prod_FIX47_CONSUMO_ABIERTO_VARIABLE`.

# Instrucciones para completar ReCuenta (versión final)

Lee este archivo completo antes de tocar código. Trabaja por fases, en orden. Al terminar cada fase, verifica lo indicado, haz un commit de git y dime en 3 o 4 líneas qué quedó listo. No pases a la siguiente fase con algo roto.

---

## 0. Contexto

**ReCuenta** es el prototipo web de un proyecto universitario (Ingeniería Económica para Software, UNEMI). Es un software ficticio para que una **distribuidora de Milagro (Ecuador)** gestione mercadería entregada **en consignación** a tiendas de barrio. El flujo es: entrega → venta reportada → devolución → conciliación → liquidación.

El prototipo se presentará en clase. Unos **40 compañeros** entrarán desde **su celular**, escaneando un QR o escribiendo el enlace de **GitHub Pages**. Debe verse y funcionar como una app comercial real, sobre todo en el teléfono.

**Propuesta de valor (el diferenciador que se vende):** *"La cuenta que los dos ven igual."* Es el único sistema donde la distribuidora **y la tienda** miran la misma cuenta. Se apoya en tres pilares:
1. **Confianza:** seguimiento del repartidor, entrega con GPS y firma, y comprobantes por WhatsApp.
2. **¿Dónde está mi dinero?:** capital inmovilizado, costo de oportunidad, alertas de vencimiento y sugerido de reposición.
3. **Decidir con datos:** semáforo de tiendas e impacto económico (antes y después).

### Estado actual (ya funciona, NO romper)
La carpeta actual contiene un prototipo funcional:
```
index.html, css/styles.css, js/datos-demo.js, js/store.js, js/app.js,
assets/ (logo, símbolo, favicon SVG), README.md, GUION_VIDEO.md, .nojekyll
```
- Es un sitio **estático**: HTML, CSS y JavaScript sin compilación ni backend. Usa **rutas relativas** y navegación por hash (`#/inicio`), y funciona publicado bajo `/recuenta/` en GitHub Pages.
- Los datos viven en `localStorage` de cada navegador. Cada visitante tiene su propia copia y la primera visita carga el caso de ejemplo.
- `store.js` contiene las reglas y validaciones de consignación. `app.js` contiene las vistas.
- La paleta es verde (`#2F5D50`, `#4F7D6B`, `#E7F0EC`) con acento ámbar (`#F2B544`). El eslogan es "Cada entrega, cada venta, cada cuenta".

**Caso de demostración que debe seguir dando exactamente estos números** (tienda *Minimarket Doña Rosa*, producto *Galletas de avena 200 g* a $0,85, noviembre de 2026):
- Entrega de 100 u., ventas reportadas de 70 u. y devoluciones de 25 u. (20 aptas, 3 dañadas, 2 vencidas). El saldo esperado es **5**.
- Al registrar un conteo físico de **0** aparecen **5 faltantes, Diferencia por revisar**.
- Liquidación: 70 × 0,85 = $59,50, menos el 2 % de descuento por exhibición (−$1,19), da **$58,31**. El faltante va aparte con un valor referencial de $4,25 y **no se cobra**.
- El conteo de Doña Rosa queda **pendiente** en los datos de ejemplo, para registrarlo en vivo.

### Reglas técnicas obligatorias
- Sigue siendo un sitio estático para GitHub Pages: `index.html` en la raíz, todo con rutas relativas y sin compilación.
- Hay internet en la presentación. Puedes usar:
  - **Leaflet 1.9.4** para mapas. Descárgalo a `vendor/leaflet/`; no lo cargues desde un CDN.
  - Teselas de **OpenStreetMap**.
  - **Nominatim** para buscar direcciones: solo al pulsar un botón, con `countrycodes=ec`, priorizando Milagro, una consulta a la vez y con mensaje de espera.
  - Enlaces `https://www.google.com/maps/dir/?api=1&...` y `https://wa.me/...`.
- Para el QR, guarda una librería pequeña en `vendor/` (por ejemplo `qrcode-generator`).
- Español neutro en toda la interfaz. Los datos son ficticios.
- Sube `version` de los datos a **2** para que los visitantes con datos viejos reciban el caso nuevo.
- Haz commits por fase: `git init` si no existe.

---

## Fase 1. Acceso, perfiles y usuarios

1. **Quita** de la pantalla de acceso el bloque "Ingresar con correo y contraseña de demostración" (el formulario y la tabla de credenciales). Quita también las credenciales del README. Se mantiene el panel "Perfiles" con tarjetas e **Ingresar**.
2. **Cuatro perfiles** en el acceso: **Administrador, Repartidor, Contador y Tienda**, cada uno con icono, nombre, descripción corta y botón. Al pulsar Ingresar:
   - si hay un solo usuario activo con ese perfil, entra directo;
   - si hay varios, muestra un selector para elegir el usuario;
   - si no hay ninguno, muestra un aviso.
3. **Permisos:**

| Módulo | Admin | Repartidor | Contador | Tienda |
|---|---|---|---|---|
| Inicio (su versión) | ✓ | ✓ | ✓ | ✓ |
| Tiendas y productos | editar | — | consulta | — |
| Mi ruta (mapa) | consulta | ✓ | — | — |
| Entregas, Ventas, Devoluciones | ✓ | ✓ (solo sus tiendas) | — | consulta de su tienda |
| Conciliación | ✓ | conteo (sus tiendas) | revisión | consulta de su tienda |
| Liquidación | ✓ | — | ✓ | consulta de su tienda |
| ¿Dónde está mi dinero? / Semáforo | ✓ | — | ✓ | — |
| Impacto económico | ✓ | — | ✓ | — |
| Usuarios | ✓ | — | — | — |
| Bitácora | ✓ | — | ✓ | — |
| Seguimiento del repartidor | ✓ | — | — | ✓ |

   - El repartidor solo ve las **tiendas de su ruta**, en selectores, listas e indicadores.
   - El usuario Tienda está **vinculado a una sola tienda** y solo ve esa.
4. **Módulo Usuarios** (solo administrador) para crear, editar y activar o desactivar usuarios.
   - Campos: nombre y apellido, correo, celular, perfil, estado, **tiendas de la ruta** (si es repartidor, al menos una) y **tienda vinculada** (si es tienda, obligatoria).
   - Debe quedar siempre al menos un administrador activo, y un usuario no puede desactivarse ni cambiarse el perfil a sí mismo.
   - Usuarios de ejemplo: Andrea Salazar (admin), Jorge Cedeño (repartidor de las tiendas T1, T2 y T3), María Torres (contadora) y Rosa Mendoza (tienda, vinculada a Minimarket Doña Rosa).
5. **Bitácora:** registra cada acción con fecha y hora, usuario, tipo y detalle: entregas, ventas, devoluciones, conteos, revisiones, cierres, cambios de catálogo y de usuarios, y excepciones de GPS. La vista tiene filtro por tipo y por usuario.

**Verifica:** los cuatro perfiles entran, el menú cambia según el perfil, escribir `#/usuarios` en la dirección no abre el módulo sin permiso y un usuario creado aparece en el selector del acceso.

---

## Fase 2. Validaciones en todos los campos

Cada campo muestra su mensaje **debajo, en rojo**, al salir del campo y al intentar guardar. El foco va al primer campo con error. El botón Guardar no envía con errores. Mantén también la validación en `store.js`, porque es la que manda.

| Campo | Regla |
|---|---|
| Nombres de personas (contacto, recibido por, usuario) | Solo letras, espacios, tildes, ñ, apóstrofo, punto y guion; 3 a 60 caracteres. En usuarios se exigen nombre y apellido |
| Nombre de tienda o producto | 3 a 60 caracteres, sin `< > { }`, sin duplicados |
| Dirección | Obligatoria, 5 a 90 caracteres |
| Celular o teléfono (Ecuador) | Celular `09` + 8 dígitos o fijo `0[2-7]` + 7 dígitos |
| Correo | Formato válido y único |
| Código de producto | 3 a 12 caracteres `A-Z 0-9 -`, se convierte a mayúsculas, único |
| Unidad | 2 a 20 letras |
| Precio | Mayor que 0 y hasta 999,99, con dos decimales como máximo |
| Ajuste pactado | 0 a 50 %, con un decimal; si es mayor que 0, su nombre es obligatorio |
| Fechas | Dentro del período activo y no posteriores a hoy |
| Cantidades | Enteros de 1 a 10000; no superar lo disponible |
| Conteo físico | Entero de 0 a 100000 |
| Fecha de vencimiento (lote) | Fecha válida, posterior a la de entrega |
| Latitud y longitud | Obligatorias, dentro de Ecuador (lat −5,1 a 1,7; lng −92,1 a −75,1) |
| Observación y justificación | 10 a 200 caracteres para justificar; 5 a 200 para observar; sin `< > { }` |
| Selectores obligatorios | Mensaje "Selecciona…" si están vacíos |

Mantén la protección contra doble clic en Guardar.

**Verifica:** prueba al menos un caso inválido por formulario y confirma que el mensaje es claro y que no se guarda nada.

---

## Fase 3. Ubicación de tiendas, Mi ruta y seguimiento

1. **Formulario de tienda:**
   - **Dirección** (obligatoria) y botón **Buscar en el mapa** (Nominatim), que coloca un marcador.
   - **Mapa Leaflet** con **marcador arrastrable** para ajustar el punto.
   - Botón **Usar mi ubicación** (GPS del dispositivo).
   - Latitud y longitud visibles, editables y validadas.
   - Si la búsqueda no encuentra la dirección, avisa y permite marcar a mano en el mapa.
   - Las tres tiendas de ejemplo ya tienen coordenadas reales en Milagro, cerca de `-2.134, -79.588`.
2. **Mi ruta** (repartidor):
   - Mapa con la **posición del repartidor** y las tiendas de su ruta, numeradas en el orden de visita sugerido (vecino más cercano desde su posición) y unidas por una línea.
   - Lista de paradas con distancia y estado.
   - Botón **Navegar con Google Maps**: `https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=...&waypoints=...|...&travelmode=driving`, con un máximo de 9 paradas intermedias. Google calcula la ruta más rápida real.
   - Botón **Iniciar ruta**.
3. **Seguimiento simulado** en el mismo dispositivo, sin servidor:
   - Al pulsar Iniciar ruta, la posición del repartidor avanza en el mapa hacia la siguiente tienda, actualizándose cada 1 a 2 segundos.
   - Estados según la distancia a la tienda:
     - **En camino** (más de 1 km)
     - **Cerca** (1 km o menos)
     - **Llegando** (300 m o menos)
     - **En la tienda** (150 m o menos)
     - **Entregado** (entrega guardada con firma)
   - El perfil **Tienda** ve en su inicio una tarjeta de **seguimiento** con el mapa, el estado actual, la distancia y la hora estimada (velocidad urbana de 20 km/h).
   - El estado se guarda en `localStorage`, para que al cambiar de perfil en el mismo navegador la tienda vea dónde va el repartidor.
4. **Modo demostración:**
   - Interruptor visible para el administrador y en la pantalla Mi ruta: "Simular que estoy en la tienda".
   - Coloca al repartidor dentro de los 150 m de la tienda elegida.
   - Muestra una etiqueta permanente **"Modo demostración"** mientras esté activo.
   - Sirve para grabar el video y exponer sin estar físicamente en la tienda.

**Verifica:**
- La búsqueda de una dirección de Milagro coloca el marcador.
- Arrastrar el marcador cambia la latitud y la longitud.
- El enlace de Google Maps abre con las paradas.
- La simulación pasa por los cinco estados y la tienda los ve.

---

## Fase 4. Entrega con GPS, firma y WhatsApp

1. **Al registrar una entrega:**
   - Botón **Capturar mi ubicación**: muestra la distancia a la tienda y si está **dentro del rango (150 m o menos)**.
   - Campo **Recibido por** (obligatorio).
   - **Firma** en un recuadro táctil (canvas con pointer events, que funcione con el dedo), con botón Borrar.
   - Por línea de producto: cantidad y **fecha de vencimiento del lote** (opcional, validada).
2. **Entrega fuera de rango o sin GPS:** se **permite con justificación obligatoria** (10 caracteres o más). Queda marcada **"Excepción GPS"** y aparece en una bandeja **"Excepciones por revisar"** en el inicio del administrador, con los botones *Aprobar* y *Observar*, y también en la bitácora.
3. **Comprobante de entrega:** botón en el historial que abre un detalle con los productos, el GPS (enlace al mapa), la distancia, la firma, la hora y el usuario. Incluye el botón **Enviar por WhatsApp**: `https://wa.me/593XXXXXXXXX?text=...`, convirtiendo `09XXXXXXXX` a `5939XXXXXXXX`.
4. **Liquidación:** agrega **Enviar por WhatsApp** con el resumen: tienda, período, productos, subtotal, ajuste, total y diferencias por revisar.
5. El perfil **Tienda** puede **Confirmar recepción** de una entrega, que queda registrada en la bitácora.

**Verifica:** en celular (390 px) la firma se dibuja con el dedo, la excepción GPS exige justificación y los enlaces de WhatsApp llevan el texto correcto.

---

## Fase 5. "¿Dónde está mi dinero?", semáforo y reposición

Crea un módulo **¿Dónde está mi dinero?** (admin y contador), también resumido en el inicio:

1. **Capital inmovilizado por tienda** = Σ(saldo esperado × precio del período).
   - Muestra el total y el desglose por tienda y producto.
   - Muestra el **costo de oportunidad mensual** = capital × 10 % / 12, con la frase: *"Tienes $X en mercadería en consignación. A la tasa del proyecto (10 % anual), te cuesta $Y por mes."*
2. **Alertas de vencimiento:**
   - Toma los lotes con vencimiento en **15 días o menos** que siguen en tienda.
   - Si la rotación de esa tienda es baja, sugiere **trasladar a la tienda con mayor rotación** de ese producto, con su nombre.
   - Incluye vencimientos en los datos de ejemplo para que haya al menos una alerta visible.
3. **Sugerido de reposición** en Entregas, al elegir la tienda:
   - Por producto: vendidas en el período, **rotación %** = ventas / (inicial + entregas), saldo y **sugerido** = máx(0, ventas − saldo).
   - Botón **Usar sugerencia**, que llena las líneas.
4. **Semáforo de tiendas** (puntaje de 0 a 100), con la fórmula visible en la pantalla:
   - Rotación: 50 % del puntaje (rotación % del período).
   - Exactitud: 30 % = 100 − (faltantes ÷ unidades entregadas × 100 × 5), con mínimo 0.
   - Merma: 20 % = 100 − (devoluciones dañadas o vencidas ÷ entregadas × 100 × 5), con mínimo 0.
   - Verde de 70 en adelante ("ampliar consignación"), amarillo de 40 a 69 ("mantener y vigilar") y rojo debajo de 40 ("reducir o pasar a venta directa").
   - Muestra un **límite sugerido de consignación** en USD: verde, 1,5 × ventas del período; amarillo, 1 ×; rojo, 0,5 ×.

**Verifica:** los montos cuadran a mano con el caso de ejemplo (calcula y muestra en tu resumen el capital de Doña Rosa) y hay al menos una alerta y un semáforo de cada color con los datos de ejemplo. Ajusta los datos de las otras tiendas si hace falta, **sin tocar el caso de Doña Rosa**.

---

## Fase 6. Impacto económico (antes y después)

Crea un módulo **Impacto económico** (admin y contador) que conecte el prototipo con el análisis del proyecto. Usa **exactamente** estos datos y fórmulas, que son los del Excel del proyecto:

- **Antes (proceso actual en hojas de cálculo):** conciliación $2.340 (15 h/sem × $3 × 52), diferencias $2.160, devoluciones $1.200, herramientas $720. **Total $6.420 al año.**
- **Después (con ReCuenta):** conciliación $936 (6 h/sem), diferencias $840, devoluciones $600, licencia y soporte $1.500. **Total $3.876 al año.**
- Inversión P = $7.000, valor residual S = $500, N = 5 años, i = 10 %.
- CAUE de ReCuenta = (P − S)(A/P, i, N) + S·i + costo anual = **$5.640,68**. CAUE del proceso actual = **$6.420**. Ventaja = **$779,32 al año**.
- Muestra también: TIR **25,04 %**, B/C **1,42**, payback **2,75 años**, vida útil económica **5 años** (CAUE mínimo $6.051,85).
- **Tabla antes y después**, por concepto, con barras comparativas.
- **Simulador:** un control deslizante de **horas semanales con ReCuenta** (de 4 a 15) que recalcula el CAUE, la ventaja y la decisión:
  - "Adquirir" si la ventaja es mayor que 0.
  - "Mantener el proceso actual" en caso contrario.
  - El punto de equilibrio debe dar **11 h**.
- **Compra o suscripción ("membresía"):**
  - Compra: $7.000 + $1.500 al año.
  - Suscripción: $500 de activación + $280 al mes.
  - Un control de **años de uso (1 a 5)**. Fórmulas:
    - CAUE compra(n) = (7000 − Sₙ)(A/P,10 %,n) + Sₙ·0,10 + 3876, con Sₙ = 5000, 3500, 2200, 1200 y 500.
    - CAUE suscripción(n) = 500·(A/P,10 %,n) + 2376 + 3360.
  - Valores esperados:
    - n = 3: compra **$6.026,15** y suscripción **$5.937,06**, conviene la suscripción.
    - n = 5: compra **$5.640,68** y suscripción **$5.867,90**, conviene la compra.
- Agrega la nota "Cifras del archivo Calculos_ReCuenta.xlsx (supuestos académicos)".

**Verifica:** muestra en tu resumen los valores calculados para n = 1 a 5 y para 6, 11 y 12 horas.

---

## Fase 7. Celular, QR y cierre

1. **Diseño móvil primero** (390 px):
   - **Barra de navegación inferior** con 4 accesos según el perfil y un botón **Más**.
   - Botones y campos táctiles de 44 px o más, formularios de una columna y tablas que se convierten en tarjetas o tienen scroll horizontal claro.
   - Sin desbordes horizontales.
   - Revísalo con las DevTools en 390 × 844 y en escritorio (1440 × 900).
2. **Instalable:** `manifest.webmanifest` con rutas relativas, `start_url: "./"`, iconos de 192 y 512 px en PNG generados desde el símbolo, y `theme_color` verde. Agrega un service worker simple que guarde en caché los archivos propios, con alcance relativo, para la opción "Agregar a pantalla de inicio".
3. **Compartir:** pantalla o modal con el **QR de la URL actual** (librería local) y el botón Copiar enlace.
4. **Próximamente:** una sola pantalla, honesta, con lo que no está implementado:
   - pago de la tienda con Deuna! o transferencia por QR;
   - sincronización en la nube entre dispositivos;
   - facturación electrónica del SRI.
5. **Restaurar datos de ejemplo** debe restaurar también usuarios, seguimiento y modo demostración.
6. **README:**
   - Actualiza las funciones, los perfiles y cómo entrar (sin credenciales).
   - Explica el modo demostración y los pasos de GitHub Pages (Settings → Pages → Deploy from a branch → `main` → `/(root)`, y dónde copiar el enlace).
   - Indica que el seguimiento es simulado en el mismo dispositivo.
7. **GUION_VIDEO.md:** reescribe un guion de 2:00 a 2:30 que muestre:
   - acceso;
   - seguimiento desde la tienda;
   - entrega con GPS (modo demostración) y firma;
   - ventas y devoluciones;
   - conteo de 0 con los 5 faltantes;
   - liquidación de $58,31 por WhatsApp;
   - ¿Dónde está mi dinero?;
   - Impacto económico.

### Verificación final (antes de decirme que terminaste)
Sirve el sitio desde una subcarpeta para imitar GitHub Pages:
```
mkdir -p /tmp/sitio && cp -r . /tmp/sitio/recuenta && cd /tmp/sitio && python -m http.server 8000
```
y abre `http://localhost:8000/recuenta/`. Comprueba, de ser posible con Playwright y si no a mano, y reporta cada punto como ✅ o ❌:
- [ ] Sin errores en la consola ni recursos 404 en ninguna pantalla.
- [ ] Caso de Doña Rosa: 100 / 70 / 25, esperado 5, conteo 0, faltan 5, total $58,31, CSV igual a la pantalla.
- [ ] Los cuatro perfiles con sus permisos. La URL no salta permisos.
- [ ] Usuario nuevo creado y usado para entrar.
- [ ] Validaciones en línea en todos los formularios.
- [ ] Búsqueda de dirección, marcador arrastrable y "Usar mi ubicación".
- [ ] Mi ruta con orden de paradas y enlace a Google Maps.
- [ ] Simulación con los cinco estados, vistos por el perfil Tienda.
- [ ] Entrega con firma táctil, excepción GPS con justificación y bandeja del administrador.
- [ ] WhatsApp del comprobante y de la liquidación.
- [ ] Capital inmovilizado, alerta de vencimiento y semáforo con sus colores.
- [ ] Impacto económico con los valores esperados (5.640,68 · 779,32 · 11 h · 6.026,15 / 5.937,06).
- [ ] Móvil en 390 px sin desbordes, barra inferior, QR y manifest.
- [ ] Los datos se conservan al recargar y Restaurar vuelve al caso inicial.

Si te falta tiempo, prioriza en este orden: Fases 1, 2, 4, 3, 6, 5 y 7. Lo que no alcances, muévelo a la pantalla **Próximamente**; no dejes botones que no funcionen.

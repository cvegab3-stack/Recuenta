# ReCuenta

**Cada entrega, cada venta, cada cuenta.** · *La cuenta que los dos ven igual.*

ReCuenta es el prototipo web del software propuesto en el proyecto *"Véndeme tu Software: Análisis Económico para la Toma de Decisiones Tecnológicas"* (Ingeniería Económica para Software, UNEMI, grupo 6). Una distribuidora ficticia de Milagro la usa para gestionar la mercadería que entrega **en consignación** a tiendas de barrio:

**entrega → venta reportada → devolución → conciliación → liquidación**

Su diferenciador es que la distribuidora **y la tienda** ven la misma cuenta, apoyada en tres pilares:

1. **Confianza:** seguimiento del repartidor, entrega con GPS y firma, y comprobantes por WhatsApp.
2. **¿Dónde está mi dinero?:** capital inmovilizado, costo de oportunidad, alertas de vencimiento y sugerido de reposición.
3. **Decidir con datos:** semáforo de tiendas e impacto económico (antes y después).

> Prototipo académico con datos ficticios. No hay servidor ni base de datos: todo se guarda en el navegador de cada visitante (`localStorage`). El seguimiento del repartidor es **simulado en el mismo dispositivo**.

---

## 1. Cómo entrar

Al abrir el enlace aparece la pantalla de **Perfiles**. No hay contraseñas: pulsa **Ingresar** en un perfil. Si el perfil tiene un solo usuario activo, entras directo. Si tiene varios, eliges el tuyo en una lista. Si no tiene ninguno, aparece un aviso.

| Perfil | Usuario de ejemplo | Qué puede hacer |
|---|---|---|
| Administrador | Andrea Salazar | Todo: catálogo, movimientos, conciliación, liquidación, Mi ruta (consulta), ¿Dónde está mi dinero?, Impacto económico, Usuarios, Bitácora, bandeja de excepciones GPS y modo demostración |
| Repartidor | Jorge Cedeño | Mi ruta, entregas con GPS y firma, ventas, devoluciones y conteo físico, **solo de las tiendas de su ruta** |
| Contador | María Torres | Catálogo (consulta), revisión de diferencias, liquidación, ¿Dónde está mi dinero?, Impacto económico y Bitácora |
| Tienda | Rosa Mendoza | Su tienda (Minimarket Doña Rosa): seguimiento del repartidor, entregas (con confirmación de recepción), ventas, devoluciones, conciliación y liquidación, en consulta |

Los permisos se aplican también en las reglas (`js/store.js`): escribir la dirección de un módulo sin permiso (por ejemplo `#/usuarios`) no lo abre.

En el celular, la **barra inferior** muestra cuatro accesos según el perfil y **Más** abre el menú completo. **Cerrar sesión** y **Restaurar datos de ejemplo** están al pie del menú.

---

## 2. Funciones

- **Entregas con GPS y firma:** *Capturar mi ubicación* mide la distancia a la tienda (en rango a **150 m o menos**), *Recibido por*, firma con el dedo y vencimiento del lote por producto. Sin GPS o fuera de rango, la entrega exige una justificación, queda como **Excepción GPS** y llega a la bandeja *Excepciones por revisar* del administrador (*Aprobar* u *Observar*). El **comprobante** muestra productos, ubicación, distancia, firma, hora y usuario, y se envía por **WhatsApp**. La tienda puede **Confirmar recepción**.
- **Sugerido de reposición:** al elegir la tienda en Entregas, por producto: vendidas, rotación, saldo y sugerido = máx(0, vendidas − saldo). **Usar sugerencia** llena las líneas.
- **Mi ruta:** mapa (Leaflet + OpenStreetMap) con la posición del repartidor y las paradas numeradas por cercanía, **Navegar con Google Maps** e **Iniciar ruta**.
- **Seguimiento (simulado):** al iniciar la ruta, el repartidor avanza cada 1,5 s. La tienda ve en su inicio el estado (*En camino*, *Cerca* ≤ 1 km, *Llegando* ≤ 300 m, *En la tienda* ≤ 150 m, *Entregado*), la distancia y la hora estimada a 20 km/h. Funciona al cambiar de perfil en el mismo navegador.
- **Modo demostración (para presentaciones y pruebas):** el interruptor *Simular que estoy en la tienda* (en Mi ruta y en el inicio del administrador) coloca al repartidor a unos 45 m de la tienda elegida. Mientras está activo se ve la etiqueta **Modo demostración** y *Capturar mi ubicación* usa esa posición.
- **Ubicación de tiendas:** en el formulario de tienda, **Buscar en el mapa** (Nominatim, solo Ecuador, priorizando Milagro), marcador arrastrable, toque en el mapa y **Usar mi ubicación**. Latitud y longitud son editables y se validan dentro de Ecuador.
- **¿Dónde está mi dinero?:** capital inmovilizado = Σ(saldo esperado × precio), costo de oportunidad = capital × 10 % ÷ 12, alertas de lotes que vencen en 15 días o menos (con traslado sugerido a la tienda de mayor rotación) y **semáforo de tiendas** con la fórmula visible y el límite sugerido de consignación.
- **Impacto económico:** costos antes y después, CAUE, ventaja, TIR, B/C, payback, simulador de horas y comparación compra o suscripción. Cifras del archivo *Calculos_ReCuenta.xlsx* (supuestos académicos).
- **Usuarios** y **Bitácora**: alta, edición y activación de usuarios; cada acción queda registrada y se filtra por tipo y usuario.
- **Próximamente:** pago con Deuna! o transferencia por QR, sincronización en la nube, facturación electrónica del SRI e instalación como app.

---

## 3. Caso de ejemplo (Minimarket Doña Rosa)

| Paso | Dónde | Qué se ve o se hace |
|---|---|---|
| 1 | Entregas | Entrega del 02/11/2026: **100 u.** de Galletas de avena 200 g ($0,85) |
| 2 | Ventas | Venta reportada: **70 u.** ($59,50) |
| 3 | Devoluciones | **25 u.** devueltas: 20 aptas, 3 dañadas, 2 vencidas |
| 4 | Conciliación | Saldo esperado = 0 + 100 − 70 − 25 = **5 u.**, *Pendiente de conteo* |
| 5 | Conciliación | Con el repartidor o el administrador, escribe **0** en *Conteo físico* → **faltan 5**, *Diferencia por revisar* |
| 6 | Liquidación | Total **$58,31** (70 × $0,85 = $59,50 − 2 % por exhibición $1,19). El faltante va aparte, con valor referencial $4,25, y no se cobra. **Exportar CSV**, **Imprimir / PDF** y **Enviar por WhatsApp** |

Con los datos de ejemplo, ¿Dónde está mi dinero? muestra $106,25 en consignación ($4,25 en Doña Rosa), dos alertas de vencimiento y un semáforo verde (Doña Rosa), uno amarillo (El Ahorro) y uno rojo (San Miguel). La bandeja del administrador trae una excepción GPS pendiente.

**Repetir el recorrido:** menú → **Restaurar datos de ejemplo** → **Restaurar**. Vuelven los datos, los usuarios, el seguimiento y el modo demostración iniciales.

---

## 4. Publicar en GitHub Pages

1. Crea un repositorio público (por ejemplo, `recuenta`) y sube **todo el contenido** de esta carpeta: `index.html` debe quedar en la **raíz**, junto con `css/`, `js/`, `assets/`, `vendor/` y `.nojekyll`.
2. Ve a **Settings → Pages**.
3. En **Build and deployment → Source**, elige **Deploy from a branch**.
4. En **Branch**, elige **`main`** y la carpeta **`/(root)`**. Pulsa **Save**.
5. Espera uno o dos minutos y recarga **Settings → Pages**. Arriba aparece **"Your site is live at…"** con el enlace (por ejemplo `https://tu-usuario.github.io/recuenta/`). Ese es el enlace público que puedes copiar; también aparece en la portada del repositorio, en **Deployments**.

Todas las rutas son relativas y la navegación usa `#/modulo`, así que funciona publicada bajo `/recuenta/`. Los mapas necesitan internet (teselas de OpenStreetMap y búsqueda de Nominatim); Leaflet va incluido en `vendor/`.

Para probar en tu computadora: `python -m http.server 8000` dentro de la carpeta y abre `http://localhost:8000`. La ubicación del dispositivo requiere `https` o `localhost`.

---

## 5. Reglas de negocio

- **Clave de todo movimiento:** tienda + producto + período (mes).
- **Saldo esperado** = stock inicial + entregas − ventas − devoluciones. El stock inicial es el conteo físico del período anterior.
- **Estados de conciliación:** *Pendiente de conteo*, *Conciliado*, *Diferencia por revisar* y *Diferencia revisada* (con observación del contador o del administrador).
- **Devoluciones:** se descuentan una sola vez del saldo y no se cobran a la tienda.
- **Liquidación:** cobra solo las ventas reportadas, al precio del período, menos el ajuste pactado de la tienda. Las diferencias se muestran aparte y no generan cargo automático. Con conteos pendientes o diferencias sin revisar es *Preliminar*; al cerrarla, el importe queda fijo y se bloquean los movimientos.
- **Semáforo:** puntaje = 50 % rotación + 30 % exactitud + 20 % merma. Verde ≥ 70 (ampliar, límite 1,5 × ventas), amarillo 40–69 (mantener, 1 ×), rojo < 40 (reducir o venta directa, 0,5 ×).
- **Validaciones:** cada campo muestra su mensaje debajo, en rojo, al salir del campo y al guardar; el foco va al primer error y no se guarda nada con errores. Las mismas reglas (`js/validacion.js`) se aplican otra vez en `js/store.js`: nombres, teléfonos de Ecuador, correo único, código de producto, precio (hasta 999,99 con dos decimales), ajuste (0 a 50 %), fechas dentro del período y no futuras, cantidades de 1 a 10000 sin superar lo disponible, conteo de 0 a 100000, vencimiento posterior a la entrega, coordenadas dentro de Ecuador, observaciones (5 a 200) y justificaciones (10 a 200). Hay protección contra doble clic en Guardar.

---

## 6. Estructura

```
ReCuenta/
├── index.html            Punto de entrada (acceso + aplicación)
├── css/styles.css        Estilos, diseño adaptable e impresión
├── js/datos-demo.js      Datos ficticios del caso de Milagro
├── js/validacion.js      Reglas de validación compartidas
├── js/store.js           Estado, permisos, reglas de consignación, bitácora y seguimiento
├── js/economia.js        Fórmulas del impacto económico
├── js/app.js             Vistas, navegación por perfil, mapas, CSV e impresión
├── vendor/leaflet/       Leaflet 1.9.4 (mapas)
├── assets/               Logo, símbolo y favicon
├── README.md
└── .nojekyll             Indica a GitHub Pages que publique los archivos tal cual
```

Para cambiar los datos de ejemplo, edita `js/datos-demo.js` (sube `revision` en ese archivo y en `js/store.js`) y usa **Restaurar datos de ejemplo**.
# R e c u e n t a  
 
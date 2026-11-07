# ReCuenta

**Cada entrega, cada venta, cada cuenta.**

ReCuenta es el prototipo web del software propuesto en el proyecto *"Véndeme tu Software: Análisis Económico para la Toma de Decisiones Tecnológicas"* (Ingeniería Económica para Software, UNEMI, grupo 6). Gestiona y concilia mercadería entregada **en consignación** a tiendas de barrio por una distribuidora ficticia de Milagro.

El flujo completo es: **entrega → venta reportada → devolución → conciliación → liquidación**.

> Prototipo académico. Las cuentas, los datos y el almacenamiento son **funciones de demostración**: no hay servidor, base de datos ni seguridad real. Todo se guarda en el navegador de cada visitante (`localStorage`).

---

## 1. Abrir el proyecto

### Opción A: abrir directamente
1. Extrae `ReCuenta.zip`.
2. Abre la carpeta `ReCuenta` y haz doble clic en `index.html`.

Probado en Google Chrome: los datos se conservan al recargar. Si tu navegador no permite guardar al abrir archivos locales, ReCuenta muestra un aviso amarillo arriba. En ese caso usa la opción B.

### Opción B: servidor local de VS Code (recomendado para editar)
1. En VS Code: **Archivo → Abrir carpeta…** y elige la carpeta `ReCuenta`.
2. Instala la extensión **Live Server** (Ritwick Dey).
3. Clic derecho en `index.html` → **Open with Live Server**. Se abre `http://127.0.0.1:5500/index.html`.

Alternativa sin extensiones (Python instalado): en una terminal dentro de la carpeta, ejecuta `python -m http.server 8000` y abre `http://localhost:8000`.

No hay que instalar nada más: no usa compilación, paquetes ni conexión a internet.

---

## 2. Publicar en GitHub Pages

1. Extrae `ReCuenta.zip` en tu computadora.
2. En GitHub, crea un repositorio nuevo (por ejemplo, `recuenta`), público.
3. En el repositorio: **Add file → Upload files**. Abre la carpeta extraída `ReCuenta`, selecciona **todo su contenido** (`index.html`, las carpetas `css`, `js`, `assets` y los archivos `.md`) y arrástralo. `index.html` debe quedar en la **raíz** del repositorio, no dentro de otra carpeta. Pulsa **Commit changes**.
   - El archivo `.nojekyll` está oculto en algunos sistemas. No es obligatorio, pero si puedes, súbelo también.
4. Ve a **Settings → Pages**.
5. En **Build and deployment → Source**, elige **Deploy from a branch**.
6. En **Branch**, elige **`main`** y la carpeta **`/(root)`**. Pulsa **Save**.
7. Espera uno o dos minutos y recarga la página de **Settings → Pages**. Arriba aparece **"Your site is live at…"** con el enlace, por ejemplo `https://tu-usuario.github.io/recuenta/`. Ese es el enlace público que puedes copiar y compartir. También aparece en la portada del repositorio, en la sección **Deployments** (columna derecha).

Todas las rutas son relativas (`css/…`, `js/…`, `assets/…`) y la navegación usa `#/modulo`, así que la aplicación funciona aunque GitHub la publique bajo `/recuenta/`. Cada visitante ve el caso de ejemplo en su primera visita y sus cambios quedan solo en su navegador.

---

## 3. Acceso de demostración

Al abrir el enlace aparece la pantalla de **Perfiles**. No hay contraseñas: pulsa **Ingresar** en el perfil deseado. Si el perfil tiene un solo usuario activo, entras directo. Si tiene varios, eliges el tuyo en una lista. Si no tiene ninguno, aparece un aviso.

| Perfil | Usuario de ejemplo | Puede usar |
|---|---|---|
| Administrador | Andrea Salazar | Todo: catálogo, movimientos, conciliación, liquidación y cierre, **Usuarios** y **Bitácora** |
| Repartidor | Jorge Cedeño | Inicio, entregas, ventas, devoluciones y conteo físico, **solo de las tiendas de su ruta** (T1, T2 y T3) |
| Contador | María Torres | Inicio, catálogo (consulta), conciliación (revisión de diferencias), liquidación y bitácora |
| Tienda | Rosa Mendoza | Consulta de **su tienda** (Minimarket Doña Rosa): entregas, ventas, devoluciones, conciliación y liquidación |

Los permisos se aplican también en las reglas (`store.js`): escribir la dirección de un módulo sin permiso (por ejemplo `#/usuarios`) no lo abre.

**Usuarios** (administrador): crea, edita y activa o desactiva usuarios. Un repartidor necesita al menos una tienda en su ruta y un usuario Tienda necesita su tienda vinculada. Siempre queda al menos un administrador activo, y nadie puede desactivarse ni cambiarse el perfil a sí mismo. Un usuario nuevo aparece de inmediato en la pantalla de acceso.

**Bitácora** (administrador y contador): registra cada acción con fecha y hora, usuario, tipo y detalle. Se filtra por tipo y por usuario.

**Cerrar sesión** está al pie del menú lateral (en el celular, en el menú ☰).

---

## 4. Caso de demostración (Minimarket Doña Rosa)

La primera visita carga el escenario de Milagro, de noviembre de 2026, con la tienda **Minimarket Doña Rosa** y el producto **Galletas de avena 200 g** ($0,85 por funda) ya activos:

| Paso | Dónde | Qué se ve o se hace |
|---|---|---|
| 1 | Entregas | Entrega del 02/11/2026: **100 u.** |
| 2 | Ventas | Venta reportada: **70 u.** ($59,50) |
| 3 | Devoluciones | **25 u.** devueltas: 20 aptas, 3 dañadas, 2 vencidas |
| 4 | Conciliación | Saldo esperado = 0 + 100 − 70 − 25 = **5 u.**, estado *Pendiente de conteo* |
| 5 | Conciliación | Escribe **0** en *Conteo físico* y pulsa **Guardar** → **−5 (faltan 5)**, *Diferencia por revisar* |
| 6 | Liquidación | Total a cobrar **$58,31** (70 × $0,85 = $59,50 − 2 % de descuento por exhibición $1,19). El faltante de 5 u. aparece aparte, con un valor referencial de $4,25 y sin cobrarse. **Exportar CSV** e **Imprimir / PDF** |

Opcional: en Conciliación, **Agregar** observación → **Marcar diferencia como revisada**. Con eso la liquidación queda *Lista para cerrar* y se puede **Cerrar liquidación**.

**Repetir el recorrido:** menú lateral → **Restaurar datos de ejemplo** → **Restaurar**. Se borran los cambios del navegador y vuelve el caso con el conteo pendiente.

---

## 5. Reglas de negocio implementadas

- **Clave de todo movimiento:** tienda + producto + período (mes). El filtro de tienda y período de la barra superior se conserva al navegar entre módulos.
- **Saldo esperado** = stock inicial + entregas − ventas − devoluciones. El stock inicial es el conteo físico registrado en el período anterior (0 si no existe).
- **Estados:** *Pendiente de conteo* (sin conteo), *Conciliado* (conteo = esperado), *Diferencia por revisar* (faltante o sobrante) y *Diferencia revisada* (con observación confirmada por contador o administrador). Los sobrantes se muestran como "+N (sobran N)".
- **Devoluciones:** cada unidad se descuenta una sola vez del saldo y **no se cobra a la tienda**. Las aptas vuelven a la bodega; las dañadas o vencidas son merma de la distribuidora.
- **Liquidación:** cobra solo las **ventas reportadas**, con el precio vigente del período, menos el **ajuste pactado** de la tienda (porcentaje configurable en Tiendas). Las diferencias se muestran por separado y **no generan cargo automático**, porque un faltante se revisa antes de considerarse pérdida.
- **Preliminar y cierre:** con conteos pendientes o diferencias sin revisar, la liquidación es *Preliminar* (se puede exportar e imprimir). Cuando todo está conciliado o revisado, el contador o el administrador la cierra. Al cerrar, el importe y el detalle quedan fijos aunque luego cambien precios o catálogo, y se bloquean los movimientos de esa tienda y período.
- **Precios por período:** si cambias el precio de un producto, rige desde el período activo. Los períodos anteriores conservan su precio.
- **Validaciones:** cada campo muestra su mensaje debajo, en rojo, al salir del campo y al intentar guardar. El foco va al primer campo con error y no se guarda nada mientras haya errores. Las mismas reglas (`js/validacion.js`) se aplican otra vez en `store.js`, que es la que manda:
  - Nombres de personas: solo letras, espacios, tildes, ñ y `' . -`, de 3 a 60 caracteres; en usuarios, nombre y apellido.
  - Nombres de tienda o producto: de 3 a 60 caracteres, sin `< > { }` y sin duplicados. Dirección obligatoria, de 5 a 90 caracteres.
  - Teléfonos de Ecuador: celular `09` + 8 dígitos o fijo `02`–`07` + 7 dígitos (en usuarios, solo celular). Correo con formato válido y único.
  - Código de producto de 3 a 12 caracteres `A-Z 0-9 -`, en mayúsculas y único. Unidad de 2 a 20 letras. Precio mayor que 0 y hasta 999,99, con dos decimales como máximo.
  - Ajuste pactado de 0 % a 50 % con un decimal; si es mayor que 0, su nombre es obligatorio.
  - Fechas dentro del período y no posteriores a hoy. Cantidades enteras de 1 a 10000 sin superar lo disponible. Conteo físico entero de 0 a 100000.
  - Observaciones de 5 a 200 caracteres, sin `< > { }`. Selectores obligatorios con el mensaje "Selecciona…".
  - No vender ni devolver más de lo disponible, no reducir una entrega por debajo de lo ya consumido, sin productos repetidos en una entrega y protección contra doble clic en Guardar.

### Supuestos documentados
- Los perfiles administrador, repartidor y contador son los roles definidos en la ficha técnica del proyecto. El perfil Tienda se agrega para que la tienda vea la misma cuenta que la distribuidora.
- El ajuste pactado es un porcentaje por tienda que se descuenta del subtotal. La tienda de la demostración tiene 2 % por exhibición.
- No se acordó un cargo por faltantes, así que el sistema solo los identifica y valora como referencia.
- El CSV usa `;` como separador, punto decimal y codificación UTF-8, para que Excel en español lo abra en columnas.

---

## 6. Estructura

```
ReCuenta/
├── index.html            Punto de entrada (acceso + aplicación)
├── css/styles.css        Estilos, diseño adaptable e impresión
├── js/datos-demo.js      Datos ficticios del caso de Milagro
├── js/validacion.js      Reglas de validación compartidas por la interfaz y store.js
├── js/store.js           Estado, almacenamiento local y reglas de consignación
├── js/app.js             Vistas, navegación por perfil, CSV e impresión
├── assets/               Logo, símbolo y favicon (SVG locales)
├── README.md
└── .nojekyll             Indica a GitHub Pages que publique los archivos tal cual
```

Para cambiar los datos de ejemplo, edita `js/datos-demo.js` y luego usa **Restaurar datos de ejemplo** en la aplicación.

/*
 * ReCuenta - Datos de ejemplo (ficticios).
 * Escenario: distribuidora de Milagro que entrega mercadería en consignación a tiendas de barrio.
 * Caso de la demostración: Minimarket Doña Rosa + Galletas de avena 200 g, noviembre de 2026.
 *   Entrega 100 u. -> ventas reportadas 70 u. -> devoluciones 25 u. -> saldo esperado 5 u.
 *   El conteo físico se deja pendiente para registrarlo en vivo durante la presentación.
 */
window.RC_DATOS_DEMO = function () {
  // Versión 2: agrega usuarios y bitácora. Los visitantes con datos de la versión 1 reciben este caso nuevo.
  return {
    version: 2,
    seq: 100,
    // Usuarios de la demostración (sin contraseñas: se entra eligiendo el perfil).
    usuarios: [
      { id: "U1", nombre: "Andrea Salazar", correo: "andrea.salazar@recuenta.demo", celular: "0991112233", perfil: "admin", activo: true, tiendas: [], tiendaId: "" },
      { id: "U2", nombre: "Jorge Cedeño", correo: "jorge.cedeno@recuenta.demo", celular: "0984445566", perfil: "repartidor", activo: true, tiendas: ["T1", "T2", "T3"], tiendaId: "" },
      { id: "U3", nombre: "María Torres", correo: "maria.torres@recuenta.demo", celular: "0977788899", perfil: "contador", activo: true, tiendas: [], tiendaId: "" },
      { id: "U4", nombre: "Rosa Mendoza", correo: "rosa.mendoza@recuenta.demo", celular: "0991234567", perfil: "tienda", activo: true, tiendas: [], tiendaId: "T1" }
    ],
    // Bitácora: acciones que originaron los datos de ejemplo.
    bitacora: [
      { id: "B1", fecha: "2026-11-02T08:40:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "entrega", detalle: "Entrega a Minimarket Doña Rosa: Galletas de avena 200 g × 100" },
      { id: "B2", fecha: "2026-11-02T09:25:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "entrega", detalle: "Entrega a Tienda El Ahorro: Jugo de naranja 1 L × 60, Detergente en polvo 500 g × 40" },
      { id: "B3", fecha: "2026-11-03T10:05:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "entrega", detalle: "Entrega a Comercial San Miguel: Galletas de avena 200 g × 50" },
      { id: "B4", fecha: "2026-11-05T16:10:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "venta", detalle: "Venta reportada en Minimarket Doña Rosa: Galletas de avena 200 g × 70" },
      { id: "B5", fecha: "2026-11-05T16:45:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "venta", detalle: "Ventas reportadas en Tienda El Ahorro: Jugo de naranja 1 L × 45, Detergente en polvo 500 g × 30" },
      { id: "B6", fecha: "2026-11-06T09:00:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "venta", detalle: "Venta reportada en Comercial San Miguel: Galletas de avena 200 g × 20" },
      { id: "B7", fecha: "2026-11-06T11:30:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "devolucion", detalle: "Devolución en Minimarket Doña Rosa: Galletas de avena 200 g × 25 (20 aptas, 3 dañadas, 2 vencidas)" },
      { id: "B8", fecha: "2026-11-06T12:05:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "devolucion", detalle: "Devolución en Tienda El Ahorro: Jugo de naranja 1 L × 5 (apta)" },
      { id: "B9", fecha: "2026-11-06T12:20:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "conteo", detalle: "Conteo físico en Tienda El Ahorro: Jugo de naranja 1 L = 10, Detergente en polvo 500 g = 8" }
    ],
    periodos: [
      { id: "2026-10", nombre: "Octubre 2026" },
      { id: "2026-11", nombre: "Noviembre 2026" }
    ],
    tiendas: [
      { id: "T1", nombre: "Minimarket Doña Rosa", direccion: "Av. 17 de Septiembre y García Moreno, Milagro",
        contacto: "Rosa Mendoza", telefono: "0991234567", ajustePct: 2, ajusteNombre: "Descuento por exhibición", activa: true },
      { id: "T2", nombre: "Tienda El Ahorro", direccion: "Calle Juan Montalvo y 5 de Junio, Milagro",
        contacto: "Luis Andrade", telefono: "0987654321", ajustePct: 0, ajusteNombre: "Sin ajuste pactado", activa: true },
      { id: "T3", nombre: "Comercial San Miguel", direccion: "Cdla. Las Piñas, Mz. 4, Milagro",
        contacto: "Carmen Villón", telefono: "0969876543", ajustePct: 3, ajusteNombre: "Comisión por volumen", activa: true }
    ],
    productos: [
      { id: "P1", nombre: "Galletas de avena 200 g", codigo: "GAL-200", unidad: "funda",
        precios: [{ desde: "2026-10", precio: 0.85 }], activo: true },
      { id: "P2", nombre: "Jugo de naranja 1 L", codigo: "JUG-1L", unidad: "botella",
        precios: [{ desde: "2026-10", precio: 1.40 }], activo: true },
      { id: "P3", nombre: "Detergente en polvo 500 g", codigo: "DET-500", unidad: "funda",
        precios: [{ desde: "2026-10", precio: 1.75 }], activo: true }
    ],
    entregas: [
      { id: "E1", fecha: "2026-11-02", periodo: "2026-11", tiendaId: "T1", lineas: [{ productoId: "P1", cantidad: 100 }], nota: "Guía 0012 - ruta centro" },
      { id: "E2", fecha: "2026-11-02", periodo: "2026-11", tiendaId: "T2", lineas: [{ productoId: "P2", cantidad: 60 }, { productoId: "P3", cantidad: 40 }], nota: "Guía 0013 - ruta centro" },
      { id: "E3", fecha: "2026-11-03", periodo: "2026-11", tiendaId: "T3", lineas: [{ productoId: "P1", cantidad: 50 }], nota: "Guía 0014 - ruta Las Piñas" }
    ],
    ventas: [
      { id: "V1", fecha: "2026-11-05", periodo: "2026-11", tiendaId: "T1", productoId: "P1", cantidad: 70 },
      { id: "V2", fecha: "2026-11-05", periodo: "2026-11", tiendaId: "T2", productoId: "P2", cantidad: 45 },
      { id: "V3", fecha: "2026-11-05", periodo: "2026-11", tiendaId: "T2", productoId: "P3", cantidad: 30 },
      { id: "V4", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T3", productoId: "P1", cantidad: 20 }
    ],
    devoluciones: [
      { id: "D1", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T1", productoId: "P1", cantidad: 20, condicion: "apta" },
      { id: "D2", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T1", productoId: "P1", cantidad: 3, condicion: "danada" },
      { id: "D3", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T1", productoId: "P1", cantidad: 2, condicion: "vencida" },
      { id: "D4", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T2", productoId: "P2", cantidad: 5, condicion: "apta" }
    ],
    // Conteos físicos por tienda|producto|período. El de Doña Rosa queda pendiente a propósito.
    conteos: {
      "T2|P2|2026-11": { cantidad: 10, fecha: "2026-11-06", observacion: "", revisada: false },
      "T2|P3|2026-11": { cantidad: 8, fecha: "2026-11-06", observacion: "", revisada: false }
    },
    cierres: {}
  };
};

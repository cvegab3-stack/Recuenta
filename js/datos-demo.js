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
    revision: 4,          // cambia cuando se agregan campos al caso de ejemplo
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
      { id: "B3G", fecha: "2026-11-03T10:05:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "gps", detalle: "Excepción GPS en Comercial San Miguel (sin señal GPS): «El celular no obtuvo señal GPS dentro del local; entrega hecha en el mostrador.»" },
      { id: "B4", fecha: "2026-11-05T16:10:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "venta", detalle: "Venta reportada en Minimarket Doña Rosa: Galletas de avena 200 g × 70" },
      { id: "B5", fecha: "2026-11-05T16:45:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "venta", detalle: "Ventas reportadas en Tienda El Ahorro: Jugo de naranja 1 L × 25, Detergente en polvo 500 g × 20" },
      { id: "B6", fecha: "2026-11-06T09:00:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "venta", detalle: "Venta reportada en Comercial San Miguel: Galletas de avena 200 g × 8" },
      { id: "B7", fecha: "2026-11-06T11:30:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "devolucion", detalle: "Devolución en Minimarket Doña Rosa: Galletas de avena 200 g × 25 (20 aptas, 3 dañadas, 2 vencidas)" },
      { id: "B8", fecha: "2026-11-06T12:05:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "devolucion", detalle: "Devolución en Tienda El Ahorro: Jugo de naranja 1 L × 9 (5 aptas, 4 dañadas)" },
      { id: "B8b", fecha: "2026-11-06T12:40:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "devolucion", detalle: "Devolución en Comercial San Miguel: Galletas de avena 200 g × 6 (vencida)" },
      { id: "B9", fecha: "2026-11-06T12:20:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "conteo", detalle: "Conteo físico en Tienda El Ahorro: Jugo de naranja 1 L = 24, Detergente en polvo 500 g = 18" },
      { id: "B9b", fecha: "2026-11-06T13:10:00", usuarioId: "U2", usuario: "Jorge Cedeño", tipo: "conteo", detalle: "Conteo físico en Comercial San Miguel: Galletas de avena 200 g = 32" }
    ],
    periodos: [
      { id: "2026-10", nombre: "Octubre 2026" },
      { id: "2026-11", nombre: "Noviembre 2026" }
    ],
    tiendas: [
      { id: "T1", nombre: "Minimarket Doña Rosa", direccion: "Av. 17 de Septiembre y García Moreno, Milagro",
        contacto: "Rosa Mendoza", telefono: "0991234567", ajustePct: 2, ajusteNombre: "Descuento por exhibición", activa: true, lat: -2.13248, lng: -79.58731 },
      { id: "T2", nombre: "Tienda El Ahorro", direccion: "Calle Juan Montalvo y 5 de Junio, Milagro",
        contacto: "Luis Andrade", telefono: "0987654321", ajustePct: 0, ajusteNombre: "Sin ajuste pactado", activa: true, lat: -2.13702, lng: -79.59118 },
      { id: "T3", nombre: "Comercial San Miguel", direccion: "Cdla. Las Piñas, Mz. 4, Milagro",
        contacto: "Carmen Villón", telefono: "0969876543", ajustePct: 3, ajusteNombre: "Comisión por volumen", activa: true, lat: -2.12836, lng: -79.58164 }
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
      { id: "E1", fecha: "2026-11-02", periodo: "2026-11", tiendaId: "T1", lineas: [{ productoId: "P1", cantidad: 100, vencimiento: "2027-03-15" }], nota: "Guía 0012 - ruta centro",
        recibidoPor: "Rosa Mendoza", firma: "", registradoEn: "2026-11-02T08:40:00", registradoPor: { id: "U2", nombre: "Jorge Cedeño" },
        gps: { lat: -2.13261, lng: -79.58744, precision: 12, distancia: 20 }, enRango: true, justificacion: "", excepcion: null,
        confirmada: { por: "Rosa Mendoza", en: "2026-11-02T08:52:00" } },
      { id: "E2", fecha: "2026-11-02", periodo: "2026-11", tiendaId: "T2", lineas: [{ productoId: "P2", cantidad: 60, vencimiento: "2026-11-18" }, { productoId: "P3", cantidad: 40, vencimiento: "" }], nota: "Guía 0013 - ruta centro",
        recibidoPor: "Luis Andrade", firma: "", registradoEn: "2026-11-02T09:25:00", registradoPor: { id: "U2", nombre: "Jorge Cedeño" },
        gps: { lat: -2.13690, lng: -79.59101, precision: 15, distancia: 23 }, enRango: true, justificacion: "", excepcion: null, confirmada: null },
      { id: "E3", fecha: "2026-11-03", periodo: "2026-11", tiendaId: "T3", lineas: [{ productoId: "P1", cantidad: 50, vencimiento: "2026-11-20" }], nota: "Guía 0014 - ruta Las Piñas",
        recibidoPor: "Carmen Villón", firma: "", registradoEn: "2026-11-03T10:05:00", registradoPor: { id: "U2", nombre: "Jorge Cedeño" },
        gps: null, enRango: false, justificacion: "El celular no obtuvo señal GPS dentro del local; entrega hecha en el mostrador.",
        excepcion: { estado: "pendiente", nota: "", revisadoPor: "", revisadoEn: "" }, confirmada: null }
    ],
    ventas: [
      { id: "V1", fecha: "2026-11-05", periodo: "2026-11", tiendaId: "T1", productoId: "P1", cantidad: 70 },
      { id: "V2", fecha: "2026-11-05", periodo: "2026-11", tiendaId: "T2", productoId: "P2", cantidad: 25 },
      { id: "V3", fecha: "2026-11-05", periodo: "2026-11", tiendaId: "T2", productoId: "P3", cantidad: 20 },
      { id: "V4", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T3", productoId: "P1", cantidad: 8 }
    ],
    devoluciones: [
      { id: "D1", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T1", productoId: "P1", cantidad: 20, condicion: "apta" },
      { id: "D2", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T1", productoId: "P1", cantidad: 3, condicion: "danada" },
      { id: "D3", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T1", productoId: "P1", cantidad: 2, condicion: "vencida" },
      { id: "D4", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T2", productoId: "P2", cantidad: 5, condicion: "apta" },
      { id: "D5", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T2", productoId: "P2", cantidad: 4, condicion: "danada" },
      { id: "D6", fecha: "2026-11-06", periodo: "2026-11", tiendaId: "T3", productoId: "P1", cantidad: 6, condicion: "vencida" }
    ],
    // Conteos físicos por tienda|producto|período. El de Doña Rosa queda pendiente a propósito.
    conteos: {
      "T2|P2|2026-11": { cantidad: 24, fecha: "2026-11-06", observacion: "", revisada: false },
      "T2|P3|2026-11": { cantidad: 18, fecha: "2026-11-06", observacion: "", revisada: false },
      "T3|P1|2026-11": { cantidad: 32, fecha: "2026-11-06", observacion: "", revisada: false }
    },
    cierres: {}
  };
};

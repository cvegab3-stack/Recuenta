/*
 * ReCuenta - Estado, almacenamiento local y reglas de consignación.
 * Todo se guarda en el navegador (localStorage). No hay servidor ni base de datos.
 */
(function () {
  "use strict";

  var CLAVE = "recuenta.datos.v1";
  var VERSION = 2;                 // si cambia, los visitantes con datos viejos reciben el caso de ejemplo nuevo
  var memoria = null;              // respaldo en memoria si el navegador bloquea localStorage
  var persistenciaOk = true;

  function probarAlmacenamiento() {
    try {
      var k = "recuenta.prueba";
      window.localStorage.setItem(k, "1");
      var ok = window.localStorage.getItem(k) === "1";
      window.localStorage.removeItem(k);
      return ok;
    } catch (e) { return false; }
  }

  function leer(clave) {
    if (!persistenciaOk) return memoria && memoria[clave] !== undefined ? memoria[clave] : null;
    try { return window.localStorage.getItem(clave); } catch (e) { return null; }
  }
  function escribir(clave, valor) {
    if (!persistenciaOk) { memoria = memoria || {}; memoria[clave] = valor; return; }
    try { window.localStorage.setItem(clave, valor); } catch (e) { persistenciaOk = false; escribir(clave, valor); }
  }
  function borrar(clave) {
    if (!persistenciaOk) { if (memoria) delete memoria[clave]; return; }
    try { window.localStorage.removeItem(clave); } catch (e) { /* sin efecto */ }
  }

  persistenciaOk = probarAlmacenamiento();

  var estado = null;
  var primeraVisita = false;

  function cargar() {
    var crudo = leer(CLAVE);
    if (crudo) {
      try { estado = JSON.parse(crudo); } catch (e) { estado = null; }
    }
    if (!estado || estado.version !== VERSION) {
      estado = window.RC_DATOS_DEMO();
      primeraVisita = true;
      guardar();
    }
  }
  function guardar() { escribir(CLAVE, JSON.stringify(estado)); }
  function restaurarDemo() { estado = window.RC_DATOS_DEMO(); guardar(); }
  function nuevoId(prefijo) { estado.seq = (estado.seq || 100) + 1; return prefijo + estado.seq; }

  // ---------- Perfiles y permisos (esta matriz es la que manda; la interfaz solo la refleja) ----------
  var PERFILES = {
    admin: "Administrador", repartidor: "Repartidor", contador: "Contador", tienda: "Tienda"
  };
  var PERMISOS = {
    admin: { catalogoVer: true, catalogoEditar: true, movimientos: true, conteo: true, revisar: true, cerrar: true, usuarios: true, bitacora: true, todasLasTiendas: true },
    repartidor: { movimientos: true, conteo: true },
    contador: { catalogoVer: true, revisar: true, cerrar: true, bitacora: true, todasLasTiendas: true },
    tienda: {}
  };
  var TIPOS_BITACORA = {
    acceso: "Acceso", entrega: "Entrega", venta: "Venta", devolucion: "Devolución", conteo: "Conteo",
    revision: "Revisión", cierre: "Cierre", catalogo: "Catálogo", usuario: "Usuarios", gps: "Excepción GPS"
  };

  function sesionGuardada() { try { var s = leer("recuenta.sesion"); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  // Usuario con sesión activa (null si no existe o fue desactivado).
  function actor() {
    var s = sesionGuardada();
    if (!s || !s.usuarioId) return null;
    var u = porId(estado.usuarios || [], s.usuarioId);
    return u && u.activo ? u : null;
  }
  function puede(accion, u) { u = u || actor(); return !!(u && PERMISOS[u.perfil] && PERMISOS[u.perfil][accion]); }
  // Tiendas que el usuario puede ver: todas (admin, contador), las de su ruta (repartidor) o la vinculada (tienda).
  function tiendasPermitidas(u) {
    u = u || actor();
    if (!u) return [];
    if (puede("todasLasTiendas", u)) return estado.tiendas.map(function (t) { return t.id; });
    if (u.perfil === "repartidor") return (u.tiendas || []).slice();
    if (u.perfil === "tienda") return u.tiendaId ? [u.tiendaId] : [];
    return [];
  }
  function puedeVerTienda(tid, u) { return tiendasPermitidas(u).indexOf(tid) >= 0; }
  function exigir(accion) {
    if (!actor()) error("Tu sesión terminó. Vuelve a ingresar.");
    if (!puede(accion)) error("Tu perfil no tiene permiso para esta acción.");
  }
  function exigirTienda(tid) {
    if (tid && !puedeVerTienda(tid)) error("Esa tienda no está asignada a tu usuario.", "tiendaId");
  }

  // ---------- Bitácora ----------
  function ahoraLocal() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  function registrar(tipo, detalle, u) {
    u = u || actor();
    estado.bitacora = estado.bitacora || [];
    estado.bitacora.push({ id: nuevoId("B"), fecha: ahoraLocal(), usuarioId: u ? u.id : "", usuario: u ? u.nombre : "Sistema", tipo: tipo, detalle: detalle });
    if (estado.bitacora.length > 1000) estado.bitacora = estado.bitacora.slice(-1000);
  }
  function nombreT(id) { var t = porId(estado.tiendas, id); return t ? t.nombre : id; }
  function nombreP(id) { var p = porId(estado.productos, id); return p ? p.nombre : id; }
  var CONDICION_TXT = { apta: "apta", danada: "dañada", vencida: "vencida" };

  // ---------- Utilidades ----------
  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function clave(t, p, per) { return t + "|" + p + "|" + per; }
  function claveCierre(t, per) { return t + "|" + per; }
  function porId(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; }
  function periodosOrdenados() { return estado.periodos.slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; }); }
  function periodoAnterior(per) {
    var ps = periodosOrdenados(), prev = null;
    for (var i = 0; i < ps.length; i++) { if (ps[i].id === per) return prev; prev = ps[i].id; }
    return null;
  }
  function esEntero(n) { return typeof n === "number" && isFinite(n) && Math.floor(n) === n; }

  function precioEn(producto, per) {
    var precios = producto.precios.slice().sort(function (a, b) { return a.desde < b.desde ? -1 : 1; });
    var p = null;
    for (var i = 0; i < precios.length; i++) if (precios[i].desde <= per) p = precios[i].precio;
    if (p === null && precios.length) p = precios[0].precio;
    return p || 0;
  }

  function cerrado(t, per) { return !!estado.cierres[claveCierre(t, per)]; }

  // ---------- Saldos por tienda, producto y período ----------
  function movimientos(t, p, per, excluir) {
    var ent = 0, ven = 0, apt = 0, dan = 0, venc = 0;
    estado.entregas.forEach(function (e) {
      if (e.tiendaId !== t || e.periodo !== per || (excluir && excluir.entrega === e.id)) return;
      e.lineas.forEach(function (l) { if (l.productoId === p) ent += l.cantidad; });
    });
    estado.ventas.forEach(function (v) {
      if (v.tiendaId === t && v.productoId === p && v.periodo === per && !(excluir && excluir.venta === v.id)) ven += v.cantidad;
    });
    estado.devoluciones.forEach(function (d) {
      if (d.tiendaId === t && d.productoId === p && d.periodo === per && !(excluir && excluir.devolucion === d.id)) {
        if (d.condicion === "apta") apt += d.cantidad; else if (d.condicion === "danada") dan += d.cantidad; else venc += d.cantidad;
      }
    });
    return { entregas: ent, ventas: ven, devAptas: apt, devDanadas: dan, devVencidas: venc, devoluciones: apt + dan + venc };
  }

  // Stock inicial = conteo físico del período anterior (si se registró).
  function stockInicial(t, p, per) {
    var ant = periodoAnterior(per);
    if (!ant) return 0;
    var c = estado.conteos[clave(t, p, ant)];
    return c ? c.cantidad : 0;
  }

  function fila(t, p, per) {
    var m = movimientos(t, p, per);
    var ini = stockInicial(t, p, per);
    var esperado = ini + m.entregas - m.ventas - m.devoluciones;
    var c = estado.conteos[clave(t, p, per)] || null;
    var dif = c ? c.cantidad - esperado : null;
    var est;
    if (!c) est = "pendiente";
    else if (dif === 0) est = "conciliado";
    else if (c.revisada) est = "revisada";
    else est = "diferencia";
    return {
      tiendaId: t, productoId: p, periodo: per, inicial: ini,
      entregas: m.entregas, ventas: m.ventas, devAptas: m.devAptas, devDanadas: m.devDanadas,
      devVencidas: m.devVencidas, devoluciones: m.devoluciones, esperado: esperado,
      conteo: c ? c.cantidad : null, diferencia: dif, estado: est,
      observacion: c ? c.observacion || "" : "", fechaConteo: c ? c.fecha : null
    };
  }

  // Filas con algún movimiento o saldo inicial. Filtro opcional por tienda ("" = todas).
  function filasConciliacion(tienda, per) {
    var res = [];
    estado.tiendas.forEach(function (t) {
      if (tienda && t.id !== tienda) return;
      estado.productos.forEach(function (p) {
        var f = fila(t.id, p.id, per);
        if (f.inicial || f.entregas || f.ventas || f.devoluciones || f.conteo !== null) res.push(f);
      });
    });
    return res;
  }

  function disponible(t, p, per, excluir) {
    var m = movimientos(t, p, per, excluir);
    return stockInicial(t, p, per) + m.entregas - m.ventas - m.devoluciones;
  }

  // ---------- Liquidación ----------
  function calcularLiquidacion(t, per) {
    var tienda = porId(estado.tiendas, t);
    var lineas = [];
    var subtotal = 0;
    estado.productos.forEach(function (p) {
      var m = movimientos(t, p.id, per);
      if (m.ventas > 0) {
        var precio = precioEn(p, per);
        var st = r2(m.ventas * precio);
        subtotal = r2(subtotal + st);
        lineas.push({ productoId: p.id, producto: p.nombre, codigo: p.codigo, cantidad: m.ventas, precio: precio, subtotal: st });
      }
    });
    var pct = tienda ? Number(tienda.ajustePct) || 0 : 0;
    var ajuste = r2(-subtotal * pct / 100);
    var total = r2(subtotal + ajuste);

    var filas = filasConciliacion(t, per);
    var diferencias = [], pendientes = [], bloqueantes = 0;
    filas.forEach(function (f) {
      var p = porId(estado.productos, f.productoId);
      if (f.estado === "pendiente") { pendientes.push({ producto: p.nombre, esperado: f.esperado }); bloqueantes++; }
      if (f.diferencia !== null && f.diferencia !== 0) {
        var precio = precioEn(p, per);
        diferencias.push({
          producto: p.nombre, esperado: f.esperado, conteo: f.conteo, diferencia: f.diferencia,
          tipo: f.diferencia < 0 ? "Faltante" : "Sobrante", unidades: Math.abs(f.diferencia),
          valorReferencial: r2(Math.abs(f.diferencia) * precio), revisada: f.estado === "revisada", observacion: f.observacion
        });
        if (f.estado === "diferencia") bloqueantes++;
      }
    });
    return {
      tiendaId: t, tienda: tienda ? tienda.nombre : "", periodo: per,
      periodoNombre: (porId(estado.periodos, per) || {}).nombre || per,
      lineas: lineas, subtotal: subtotal, ajusteNombre: tienda ? tienda.ajusteNombre : "", ajustePct: pct,
      ajuste: ajuste, total: total, diferencias: diferencias, pendientes: pendientes,
      estado: bloqueantes > 0 ? "Preliminar" : "Lista para cerrar"
    };
  }

  function liquidacion(t, per) {
    var c = estado.cierres[claveCierre(t, per)];
    if (c) { var s = JSON.parse(JSON.stringify(c.snapshot)); s.estado = "Cerrada"; s.fechaCierre = c.fecha; return s; }
    return calcularLiquidacion(t, per);
  }

  // ---------- Validaciones comunes ----------
  function error(msg, campo) { var e = new Error(msg); e.campo = campo; throw e; }
  function chk(msg, campo) { if (msg) error(msg, campo); }
  var V = window.RCV;

  function validarBase(r) {
    if (!r.tiendaId || !porId(estado.tiendas, r.tiendaId)) error("Selecciona la tienda.", "tiendaId");
    if (!r.periodo || !porId(estado.periodos, r.periodo)) error("Selecciona el período.", "periodo");
    chk(V.fecha(r.fecha, r.periodo, (porId(estado.periodos, r.periodo) || {}).nombre), "fecha");
    if (cerrado(r.tiendaId, r.periodo)) error("La liquidación de esta tienda y período ya está cerrada. No se pueden modificar sus movimientos.", "tiendaId");
  }
  function validarCantidad(c, campo) {
    chk(V.cantidad(typeof c === "number" && isFinite(c) ? String(c) : (typeof c === "string" ? c : "")), campo || "cantidad");
  }

  // ---------- Operaciones ----------
  var API = {
    persistenciaOk: function () { return persistenciaOk; },
    primeraVisita: function () { return primeraVisita; },
    get: function () { return estado; },
    restaurarDemo: restaurarDemo,
    precioEn: precioEn, porId: porId, cerrado: cerrado, r2: r2,
    periodosOrdenados: periodosOrdenados,
    fila: fila, filasConciliacion: filasConciliacion, disponible: disponible, liquidacion: liquidacion,

    guardarEntrega: function (r) {
      exigir("movimientos");
      validarBase(r);
      exigirTienda(r.tiendaId);
      if (r.id) { var prevE = porId(estado.entregas, r.id); if (prevE) exigirTienda(prevE.tiendaId); }
      function resumenLineas(ls) { return ls.map(function (l) { return nombreP(l.productoId) + " × " + l.cantidad; }).join(", "); }
      if (!r.lineas || !r.lineas.length) error("Agrega al menos un producto a la entrega.", "lineas");
      var vistos = {};
      r.lineas.forEach(function (l, i) {
        if (!l.productoId || !porId(estado.productos, l.productoId)) error("Selecciona el producto.", "linea-" + i);
        if (vistos[l.productoId]) error("El producto está repetido en la entrega. Suma las cantidades en una sola línea.", "linea-" + i);
        vistos[l.productoId] = true;
        validarCantidad(l.cantidad, "cantidad-" + i);
      });
      chk(V.nota(r.nota), "nota");
      r.nota = String(r.nota || "").trim();
      if (r.id) {
        var previo = porId(estado.entregas, r.id);
        if (!previo) error("La entrega ya no existe.");
        if (cerrado(previo.tiendaId, previo.periodo)) error("La entrega pertenece a una liquidación cerrada.");
        // Al corregir, el saldo de cada producto afectado no puede quedar negativo.
        var afectados = {};
        previo.lineas.forEach(function (l) { afectados[previo.tiendaId + "|" + l.productoId + "|" + previo.periodo] = true; });
        r.lineas.forEach(function (l) { afectados[r.tiendaId + "|" + l.productoId + "|" + r.periodo] = true; });
        Object.keys(afectados).forEach(function (k) {
          var partes = k.split("|");
          var base = disponible(partes[0], partes[1], partes[2], { entrega: r.id });
          var nuevo = 0;
          if (r.tiendaId === partes[0] && r.periodo === partes[2]) r.lineas.forEach(function (l) { if (l.productoId === partes[1]) nuevo += l.cantidad; });
          if (base + nuevo < 0) {
            var p = porId(estado.productos, partes[1]);
            error("No se puede reducir la entrega de " + p.nombre + ": ya hay " + (-base) + " u. registradas como vendidas o devueltas. La cantidad mínima es " + (-base) + ".", "lineas");
          }
        });
        previo.fecha = r.fecha; previo.periodo = r.periodo; previo.tiendaId = r.tiendaId;
        previo.lineas = r.lineas.map(function (l) { return { productoId: l.productoId, cantidad: l.cantidad }; });
        previo.nota = r.nota || "";
        registrar("entrega", "Corrección de entrega " + previo.id + " a " + nombreT(previo.tiendaId) + ": " + resumenLineas(previo.lineas));
        guardar();
        return previo;
      }
      var nueva = { id: nuevoId("E"), fecha: r.fecha, periodo: r.periodo, tiendaId: r.tiendaId,
        lineas: r.lineas.map(function (l) { return { productoId: l.productoId, cantidad: l.cantidad }; }), nota: r.nota || "" };
      estado.entregas.push(nueva);
      registrar("entrega", "Entrega a " + nombreT(nueva.tiendaId) + ": " + resumenLineas(nueva.lineas));
      guardar();
      return nueva;
    },

    eliminarEntrega: function (id) {
      exigir("movimientos");
      var e = porId(estado.entregas, id);
      if (!e) return;
      exigirTienda(e.tiendaId);
      if (cerrado(e.tiendaId, e.periodo)) error("La entrega pertenece a una liquidación cerrada.");
      e.lineas.forEach(function (l) {
        if (disponible(e.tiendaId, l.productoId, e.periodo, { entrega: id }) < 0)
          error("No se puede eliminar: hay ventas o devoluciones de " + porId(estado.productos, l.productoId).nombre + " que dependen de esta entrega.");
      });
      estado.entregas = estado.entregas.filter(function (x) { return x.id !== id; });
      registrar("entrega", "Eliminación de la entrega " + e.id + " del " + e.fecha + " a " + nombreT(e.tiendaId));
      guardar();
    },

    guardarMovimiento: function (tipo, r) {      // tipo: "ventas" | "devoluciones"
      exigir("movimientos");
      validarBase(r);
      exigirTienda(r.tiendaId);
      if (r.id) { var prevM = porId(estado[tipo], r.id); if (prevM) exigirTienda(prevM.tiendaId); }
      var tipoB = tipo === "ventas" ? "venta" : "devolucion";
      function detalleMov(m) {
        return (tipo === "ventas" ? "Venta reportada en " : "Devolución en ") + nombreT(m.tiendaId) + ": " + nombreP(m.productoId) + " × " + m.cantidad +
          (tipo === "devoluciones" ? " (" + CONDICION_TXT[m.condicion] + ")" : "");
      }
      if (!r.productoId || !porId(estado.productos, r.productoId)) error("Selecciona el producto.", "productoId");
      validarCantidad(r.cantidad);
      if (tipo === "devoluciones" && ["apta", "danada", "vencida"].indexOf(r.condicion) < 0) error("Indica la condición de las unidades devueltas.", "condicion");
      var excl = {}; excl[tipo === "ventas" ? "venta" : "devolucion"] = r.id || null;
      if (r.id) {
        var prev = porId(estado[tipo], r.id);
        if (prev && cerrado(prev.tiendaId, prev.periodo)) error("El registro pertenece a una liquidación cerrada.");
      }
      var disp = disponible(r.tiendaId, r.productoId, r.periodo, excl);
      if (r.cantidad > disp) {
        var p = porId(estado.productos, r.productoId);
        error("Solo hay " + Math.max(disp, 0) + " u. de " + p.nombre + " disponibles en esta tienda y período. Revisa la cantidad o registra primero la entrega.", "cantidad");
      }
      if (r.id) {
        var reg = porId(estado[tipo], r.id);
        reg.fecha = r.fecha; reg.periodo = r.periodo; reg.tiendaId = r.tiendaId; reg.productoId = r.productoId; reg.cantidad = r.cantidad;
        if (tipo === "devoluciones") reg.condicion = r.condicion;
        registrar(tipoB, "Corrección. " + detalleMov(reg));
        guardar();
        return reg;
      }
      var n = { id: nuevoId(tipo === "ventas" ? "V" : "D"), fecha: r.fecha, periodo: r.periodo, tiendaId: r.tiendaId, productoId: r.productoId, cantidad: r.cantidad };
      if (tipo === "devoluciones") n.condicion = r.condicion;
      estado[tipo].push(n);
      registrar(tipoB, detalleMov(n));
      guardar();
      return n;
    },

    eliminarMovimiento: function (tipo, id) {
      exigir("movimientos");
      var reg = porId(estado[tipo], id);
      if (!reg) return;
      exigirTienda(reg.tiendaId);
      if (cerrado(reg.tiendaId, reg.periodo)) error("El registro pertenece a una liquidación cerrada.");
      estado[tipo] = estado[tipo].filter(function (x) { return x.id !== id; });
      registrar(tipo === "ventas" ? "venta" : "devolucion", "Eliminación de " + (tipo === "ventas" ? "la venta " : "la devolución ") + reg.id + " en " + nombreT(reg.tiendaId) + ": " + nombreP(reg.productoId) + " × " + reg.cantidad);
      guardar();
    },

    guardarConteo: function (t, p, per, cantidad, observacion) {
      exigir("conteo");
      exigirTienda(t);
      if (cerrado(t, per)) error("La liquidación de esta tienda y período ya está cerrada.");
      chk(V.conteo(esEntero(cantidad) ? String(cantidad) : (typeof cantidad === "string" ? cantidad : "x")), "conteo");
      cantidad = Number(cantidad);
      var k = clave(t, p, per);
      var prev = estado.conteos[k];
      var hoy = new Date();
      var f = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");
      estado.conteos[k] = { cantidad: cantidad, fecha: f, observacion: observacion !== undefined ? observacion : (prev ? prev.observacion : ""),
        revisada: prev && prev.cantidad === cantidad ? !!prev.revisada : false };
      var fc = fila(t, p, per);
      registrar("conteo", "Conteo físico en " + nombreT(t) + ": " + nombreP(p) + " = " + cantidad + " (esperado " + fc.esperado + ", " +
        (fc.diferencia === 0 ? "conciliado" : (fc.diferencia < 0 ? "faltan " + (-fc.diferencia) : "sobran " + fc.diferencia)) + ")");
      guardar();
      return fc;
    },

    guardarObservacion: function (t, p, per, texto, marcarRevisada) {
      if (!actor()) error("Tu sesión terminó. Vuelve a ingresar.");
      if (marcarRevisada !== undefined) exigir("revisar");
      else if (!puede("conteo") && !puede("revisar")) error("Tu perfil no tiene permiso para esta acción.");
      exigirTienda(t);
      if (cerrado(t, per)) error("La liquidación de esta tienda y período ya está cerrada.");
      var k = clave(t, p, per);
      var c = estado.conteos[k];
      if (!c) error("Primero registra el conteo físico.");
      texto = (texto || "").trim();
      // Toda observación (y marcar la diferencia como revisada) exige de 5 a 200 caracteres. Reabrir no la exige.
      if (marcarRevisada !== false) chk(V.observacion(texto), "observacion");
      else chk(V.texto(texto, 5, 200, "la observación", true), "observacion");
      c.observacion = texto;
      if (marcarRevisada !== undefined) c.revisada = !!marcarRevisada;
      registrar("revision", (marcarRevisada === true ? "Diferencia marcada como revisada" : marcarRevisada === false ? "Diferencia reabierta" : "Observación guardada") +
        " en " + nombreT(t) + ", " + nombreP(p) + (texto ? ": «" + texto + "»" : ""));
      guardar();
      return fila(t, p, per);
    },

    cerrarLiquidacion: function (t, per) {
      exigir("cerrar");
      if (cerrado(t, per)) error("Esta liquidación ya está cerrada.");
      var liq = calcularLiquidacion(t, per);
      if (liq.estado !== "Lista para cerrar")
        error("No se puede cerrar: hay conteos pendientes o diferencias sin revisar. Puedes exportar la liquidación preliminar.");
      if (!liq.lineas.length) error("No hay ventas reportadas para liquidar en esta tienda y período.");
      var hoy = new Date().toISOString().slice(0, 10);
      estado.cierres[claveCierre(t, per)] = { fecha: hoy, snapshot: liq };
      registrar("cierre", "Liquidación cerrada de " + liq.tienda + " (" + liq.periodoNombre + ") por $" + liq.total.toFixed(2));
      guardar();
      return liquidacion(t, per);
    },

    // ---------- Catálogo ----------
    guardarTienda: function (r) {
      exigir("catalogoEditar");
      var nombre = String(r.nombre || "").trim();
      chk(V.nombreCosa(nombre, "de la tienda", function (s) {
        return estado.tiendas.some(function (t) { return t.nombre.toLowerCase() === s.toLowerCase() && t.id !== r.id; });
      }), "nombre");
      chk(V.nombrePersona(r.contacto, { etiqueta: "el nombre del contacto" }), "contacto");
      chk(V.direccion(r.direccion), "direccion");
      chk(V.telefono(r.telefono), "telefono");
      chk(V.ajustePct(r.ajustePct), "ajustePct");
      var pct = Number(String(r.ajustePct).replace(",", "."));
      chk(V.ajusteNombre(r.ajusteNombre, pct), "ajusteNombre");
      var datos = { nombre: nombre, direccion: String(r.direccion).trim(), contacto: String(r.contacto).trim().replace(/\s+/g, " "), telefono: V.limpiarTelefono(r.telefono),
        ajustePct: pct, ajusteNombre: String(r.ajusteNombre || "").trim() || "Sin ajuste pactado", activa: r.activa !== false };
      if (r.id) { var t = porId(estado.tiendas, r.id); Object.assign(t, datos); registrar("catalogo", "Tienda editada: " + t.nombre); guardar(); return t; }
      var n = Object.assign({ id: nuevoId("T") }, datos);
      estado.tiendas.push(n); registrar("catalogo", "Tienda creada: " + n.nombre); guardar(); return n;
    },

    guardarProducto: function (r, perActual) {
      exigir("catalogoEditar");
      var nombre = String(r.nombre || "").trim();
      chk(V.nombreCosa(nombre, "del producto", function (s) {
        return estado.productos.some(function (p) { return p.nombre.toLowerCase() === s.toLowerCase() && p.id !== r.id; });
      }), "nombre");
      var codigo = String(r.codigo || "").trim().toUpperCase();
      chk(V.codigo(codigo, function (s) { return estado.productos.some(function (p) { return (p.codigo || "").toUpperCase() === s && p.id !== r.id; }); }), "codigo");
      chk(V.unidad(r.unidad), "unidad");
      chk(V.precio(r.precio), "precio");
      var precio = r2(Number(String(r.precio).replace(",", ".")));
      var datos = { nombre: nombre, codigo: codigo, unidad: String(r.unidad).trim().toLowerCase(), activo: r.activo !== false };
      if (r.id) {
        var p = porId(estado.productos, r.id);
        Object.assign(p, datos);
        if (precioEn(p, perActual) !== precio) {
          // El nuevo precio rige desde el período activo; los anteriores y las liquidaciones cerradas no cambian.
          p.precios = p.precios.filter(function (x) { return x.desde !== perActual; });
          p.precios.push({ desde: perActual, precio: precio });
          registrar("catalogo", "Precio de " + p.nombre + " desde " + perActual + ": $" + precio.toFixed(2));
        }
        registrar("catalogo", "Producto editado: " + p.nombre);
        guardar(); return p;
      }
      var n = Object.assign({ id: nuevoId("P"), precios: [{ desde: estado.periodos[0].id, precio: precio }] }, datos);
      estado.productos.push(n); registrar("catalogo", "Producto creado: " + n.nombre + " ($" + precio.toFixed(2) + ")"); guardar(); return n;
    },

    agregarPeriodo: function () {
      exigir("catalogoEditar");
      var ps = periodosOrdenados();
      var ult = ps[ps.length - 1].id.split("-");
      var y = Number(ult[0]), m = Number(ult[1]) + 1;
      if (m > 12) { m = 1; y++; }
      var id = y + "-" + String(m).padStart(2, "0");
      var meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      var nuevo = { id: id, nombre: meses[m - 1] + " " + y };
      estado.periodos.push(nuevo); registrar("catalogo", "Período abierto: " + nuevo.nombre); guardar(); return nuevo;
    },

    // ---------- Usuarios ----------
    usuarios: function () { return estado.usuarios || []; },
    usuariosActivos: function (perfil) { return (estado.usuarios || []).filter(function (u) { return u.activo && (!perfil || u.perfil === perfil); }); },

    guardarUsuario: function (r) {
      exigir("usuarios");
      var yo = actor();
      var nombre = String(r.nombre || "").trim().replace(/\s+/g, " ");
      chk(V.nombrePersona(nombre, { apellido: true, etiqueta: "el nombre y apellido" }), "nombre");
      var correo = String(r.correo || "").trim().toLowerCase();
      chk(V.correo(correo, function (s) { return (estado.usuarios || []).some(function (u) { return u.correo.toLowerCase() === s && u.id !== r.id; }); }), "correo");
      chk(V.telefono(r.celular, true), "celular");
      var celular = V.limpiarTelefono(r.celular);
      if (!PERFILES[r.perfil]) error("Selecciona el perfil.", "perfil");
      var activo = r.activo !== false;
      var tiendas = [], tiendaId = "";
      if (r.perfil === "repartidor") {
        tiendas = (r.tiendas || []).filter(function (id, i, a) { return porId(estado.tiendas, id) && a.indexOf(id) === i; });
        if (!tiendas.length) error("Asigna al menos una tienda a la ruta del repartidor.", "tiendas");
      }
      if (r.perfil === "tienda") {
        tiendaId = r.tiendaId || "";
        if (!porId(estado.tiendas, tiendaId)) error("Selecciona la tienda vinculada.", "tiendaId");
      }
      var previo = r.id ? porId(estado.usuarios, r.id) : null;
      if (r.id && !previo) error("El usuario ya no existe.");
      if (previo && previo.id === yo.id) {
        if (!activo) error("No puedes desactivar tu propio usuario.", "activo");
        if (r.perfil !== previo.perfil) error("No puedes cambiar el perfil de tu propio usuario.", "perfil");
      }
      // Debe quedar al menos un administrador activo.
      if (previo && previo.perfil === "admin" && previo.activo && (r.perfil !== "admin" || !activo)) {
        var otros = estado.usuarios.filter(function (u) { return u.perfil === "admin" && u.activo && u.id !== previo.id; });
        if (!otros.length) error("Debe quedar al menos un administrador activo.", r.perfil !== "admin" ? "perfil" : "activo");
      }
      var datos = { nombre: nombre, correo: correo, celular: celular, perfil: r.perfil, activo: activo, tiendas: tiendas, tiendaId: tiendaId };
      if (previo) {
        Object.assign(previo, datos);
        registrar("usuario", "Usuario editado: " + previo.nombre + " (" + PERFILES[previo.perfil] + (previo.activo ? "" : ", inactivo") + ")");
        guardar(); return previo;
      }
      var n = Object.assign({ id: nuevoId("U") }, datos);
      estado.usuarios.push(n);
      registrar("usuario", "Usuario creado: " + n.nombre + " (" + PERFILES[n.perfil] + ")");
      guardar(); return n;
    },

    cambiarEstadoUsuario: function (id, activo) {
      exigir("usuarios");
      var u = porId(estado.usuarios, id);
      if (!u) error("El usuario ya no existe.");
      var datos = Object.assign({}, u, { activo: !!activo });
      return API.guardarUsuario(datos);
    },

    // ---------- Bitácora ----------
    TIPOS_BITACORA: TIPOS_BITACORA,
    bitacora: function () { return (estado.bitacora || []).slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : (a.fecha > b.fecha ? -1 : 0); }); },
    registrar: function (tipo, detalle) { if (!TIPOS_BITACORA[tipo]) return; registrar(tipo, detalle); guardar(); },

    // ---------- Perfiles ----------
    PERFILES: PERFILES,
    actor: actor,
    puede: function (accion) { return puede(accion); },
    tiendasPermitidas: function () { return tiendasPermitidas(); },
    puedeVerTienda: function (tid) { return puedeVerTienda(tid); },

    // ---------- Sesión y filtros (también locales) ----------
    sesion: actor,
    iniciarSesion: function (usuarioId) {
      var u = porId(estado.usuarios || [], usuarioId);
      if (!u || !u.activo) error("Ese usuario no existe o está inactivo.");
      escribir("recuenta.sesion", JSON.stringify({ usuarioId: u.id }));
      registrar("acceso", "Inicio de sesión como " + PERFILES[u.perfil], u);
      guardar();
      return u;
    },
    cerrarSesion: function () { borrar("recuenta.sesion"); },
    filtro: function () {
      var f = null;
      try { f = JSON.parse(leer("recuenta.filtro") || "null"); } catch (e) { f = null; }
      if (!f || !porId(estado.periodos, f.periodo)) f = { tienda: "", periodo: periodosOrdenados()[periodosOrdenados().length - 1].id };
      if (f.tienda && !porId(estado.tiendas, f.tienda)) f.tienda = "";
      var u = actor();
      if (u && f.tienda && !puedeVerTienda(f.tienda, u)) f.tienda = "";
      // El usuario Tienda siempre trabaja sobre su tienda vinculada.
      if (u && u.perfil === "tienda") f.tienda = u.tiendaId;
      return f;
    },
    guardarFiltro: function (f) { escribir("recuenta.filtro", JSON.stringify(f)); }
  };

  cargar();
  window.RC = API;
})();

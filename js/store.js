/*
 * ReCuenta - Estado, almacenamiento local y reglas de consignación.
 * Todo se guarda en el navegador (localStorage). No hay servidor ni base de datos.
 */
(function () {
  "use strict";

  var CLAVE = "recuenta.datos.v1";
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
    if (!estado || estado.version !== 1) {
      estado = window.RC_DATOS_DEMO();
      primeraVisita = true;
      guardar();
    }
  }
  function guardar() { escribir(CLAVE, JSON.stringify(estado)); }
  function restaurarDemo() { estado = window.RC_DATOS_DEMO(); guardar(); }
  function nuevoId(prefijo) { estado.seq = (estado.seq || 100) + 1; return prefijo + estado.seq; }

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
  function fechaEnPeriodo(fecha, per) { return typeof fecha === "string" && fecha.slice(0, 7) === per; }
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

  function validarBase(r) {
    if (!r.tiendaId || !porId(estado.tiendas, r.tiendaId)) error("Selecciona la tienda.", "tiendaId");
    if (!r.periodo || !porId(estado.periodos, r.periodo)) error("Selecciona el período.", "periodo");
    if (!r.fecha) error("Indica la fecha.", "fecha");
    if (!fechaEnPeriodo(r.fecha, r.periodo)) error("La fecha debe estar dentro del período " + (porId(estado.periodos, r.periodo) || {}).nombre + ".", "fecha");
    if (cerrado(r.tiendaId, r.periodo)) error("La liquidación de esta tienda y período ya está cerrada. No se pueden modificar sus movimientos.", "periodo");
  }
  function validarCantidad(c, campo) {
    if (!esEntero(c) || c <= 0) error("La cantidad debe ser un número entero mayor que cero.", campo || "cantidad");
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
      validarBase(r);
      if (!r.lineas || !r.lineas.length) error("Agrega al menos un producto a la entrega.", "lineas");
      var vistos = {};
      r.lineas.forEach(function (l, i) {
        if (!l.productoId || !porId(estado.productos, l.productoId)) error("Selecciona el producto de la línea " + (i + 1) + ".", "linea-" + i);
        if (vistos[l.productoId]) error("El producto está repetido en la entrega. Suma las cantidades en una sola línea.", "linea-" + i);
        vistos[l.productoId] = true;
        validarCantidad(l.cantidad, "linea-" + i);
      });
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
        guardar();
        return previo;
      }
      var nueva = { id: nuevoId("E"), fecha: r.fecha, periodo: r.periodo, tiendaId: r.tiendaId,
        lineas: r.lineas.map(function (l) { return { productoId: l.productoId, cantidad: l.cantidad }; }), nota: r.nota || "" };
      estado.entregas.push(nueva);
      guardar();
      return nueva;
    },

    eliminarEntrega: function (id) {
      var e = porId(estado.entregas, id);
      if (!e) return;
      if (cerrado(e.tiendaId, e.periodo)) error("La entrega pertenece a una liquidación cerrada.");
      e.lineas.forEach(function (l) {
        if (disponible(e.tiendaId, l.productoId, e.periodo, { entrega: id }) < 0)
          error("No se puede eliminar: hay ventas o devoluciones de " + porId(estado.productos, l.productoId).nombre + " que dependen de esta entrega.");
      });
      estado.entregas = estado.entregas.filter(function (x) { return x.id !== id; });
      guardar();
    },

    guardarMovimiento: function (tipo, r) {      // tipo: "ventas" | "devoluciones"
      validarBase(r);
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
        guardar();
        return reg;
      }
      var n = { id: nuevoId(tipo === "ventas" ? "V" : "D"), fecha: r.fecha, periodo: r.periodo, tiendaId: r.tiendaId, productoId: r.productoId, cantidad: r.cantidad };
      if (tipo === "devoluciones") n.condicion = r.condicion;
      estado[tipo].push(n);
      guardar();
      return n;
    },

    eliminarMovimiento: function (tipo, id) {
      var reg = porId(estado[tipo], id);
      if (!reg) return;
      if (cerrado(reg.tiendaId, reg.periodo)) error("El registro pertenece a una liquidación cerrada.");
      estado[tipo] = estado[tipo].filter(function (x) { return x.id !== id; });
      guardar();
    },

    guardarConteo: function (t, p, per, cantidad, observacion) {
      if (cerrado(t, per)) error("La liquidación de esta tienda y período ya está cerrada.");
      if (!esEntero(cantidad) || cantidad < 0) error("El conteo físico debe ser un número entero igual o mayor que cero.", "conteo");
      var k = clave(t, p, per);
      var prev = estado.conteos[k];
      var hoy = new Date();
      var f = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");
      estado.conteos[k] = { cantidad: cantidad, fecha: f, observacion: observacion !== undefined ? observacion : (prev ? prev.observacion : ""),
        revisada: prev && prev.cantidad === cantidad ? !!prev.revisada : false };
      guardar();
      return fila(t, p, per);
    },

    guardarObservacion: function (t, p, per, texto, marcarRevisada) {
      if (cerrado(t, per)) error("La liquidación de esta tienda y período ya está cerrada.");
      var k = clave(t, p, per);
      var c = estado.conteos[k];
      if (!c) error("Primero registra el conteo físico.");
      texto = (texto || "").trim();
      if (marcarRevisada && texto.length < 5) error("Para marcar la diferencia como revisada, escribe una observación (mínimo 5 caracteres).", "observacion");
      c.observacion = texto;
      if (marcarRevisada !== undefined) c.revisada = !!marcarRevisada;
      guardar();
      return fila(t, p, per);
    },

    cerrarLiquidacion: function (t, per) {
      if (cerrado(t, per)) error("Esta liquidación ya está cerrada.");
      var liq = calcularLiquidacion(t, per);
      if (liq.estado !== "Lista para cerrar")
        error("No se puede cerrar: hay conteos pendientes o diferencias sin revisar. Puedes exportar la liquidación preliminar.");
      if (!liq.lineas.length) error("No hay ventas reportadas para liquidar en esta tienda y período.");
      var hoy = new Date().toISOString().slice(0, 10);
      estado.cierres[claveCierre(t, per)] = { fecha: hoy, snapshot: liq };
      guardar();
      return liquidacion(t, per);
    },

    // ---------- Catálogo ----------
    guardarTienda: function (r) {
      var nombre = (r.nombre || "").trim();
      if (nombre.length < 3) error("Escribe el nombre de la tienda (mínimo 3 caracteres).", "nombre");
      var dup = estado.tiendas.some(function (t) { return t.nombre.toLowerCase() === nombre.toLowerCase() && t.id !== r.id; });
      if (dup) error("Ya existe una tienda con ese nombre.", "nombre");
      var pct = Number(r.ajustePct);
      if (!isFinite(pct) || pct < 0 || pct > 50) error("El ajuste pactado debe estar entre 0 % y 50 %.", "ajustePct");
      if (r.telefono && !/^[0-9 +()-]{7,15}$/.test(r.telefono)) error("El teléfono solo admite números (7 a 15 dígitos).", "telefono");
      var datos = { nombre: nombre, direccion: (r.direccion || "").trim(), contacto: (r.contacto || "").trim(), telefono: (r.telefono || "").trim(),
        ajustePct: r2(pct), ajusteNombre: (r.ajusteNombre || "").trim() || (pct ? "Ajuste pactado" : "Sin ajuste pactado"), activa: r.activa !== false };
      if (r.id) { var t = porId(estado.tiendas, r.id); Object.assign(t, datos); guardar(); return t; }
      var n = Object.assign({ id: nuevoId("T") }, datos);
      estado.tiendas.push(n); guardar(); return n;
    },

    guardarProducto: function (r, perActual) {
      var nombre = (r.nombre || "").trim();
      if (nombre.length < 3) error("Escribe el nombre del producto (mínimo 3 caracteres).", "nombre");
      var dup = estado.productos.some(function (p) { return p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== r.id; });
      if (dup) error("Ya existe un producto con ese nombre.", "nombre");
      var precio = Number(r.precio);
      if (!isFinite(precio) || precio <= 0) error("El precio de consignación debe ser mayor que cero.", "precio");
      precio = r2(precio);
      var datos = { nombre: nombre, codigo: (r.codigo || "").trim().toUpperCase(), unidad: (r.unidad || "unidad").trim(), activo: r.activo !== false };
      if (r.id) {
        var p = porId(estado.productos, r.id);
        Object.assign(p, datos);
        if (precioEn(p, perActual) !== precio) {
          // El nuevo precio rige desde el período activo; los anteriores y las liquidaciones cerradas no cambian.
          p.precios = p.precios.filter(function (x) { return x.desde !== perActual; });
          p.precios.push({ desde: perActual, precio: precio });
        }
        guardar(); return p;
      }
      var n = Object.assign({ id: nuevoId("P"), precios: [{ desde: estado.periodos[0].id, precio: precio }] }, datos);
      estado.productos.push(n); guardar(); return n;
    },

    agregarPeriodo: function () {
      var ps = periodosOrdenados();
      var ult = ps[ps.length - 1].id.split("-");
      var y = Number(ult[0]), m = Number(ult[1]) + 1;
      if (m > 12) { m = 1; y++; }
      var id = y + "-" + String(m).padStart(2, "0");
      var meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      var nuevo = { id: id, nombre: meses[m - 1] + " " + y };
      estado.periodos.push(nuevo); guardar(); return nuevo;
    },

    // ---------- Sesión y filtros (también locales) ----------
    sesion: function () { var s = leer("recuenta.sesion"); return s ? JSON.parse(s) : null; },
    iniciarSesion: function (u) { escribir("recuenta.sesion", JSON.stringify(u)); },
    cerrarSesion: function () { borrar("recuenta.sesion"); },
    filtro: function () {
      var f = leer("recuenta.filtro");
      f = f ? JSON.parse(f) : null;
      if (!f || !porId(estado.periodos, f.periodo)) f = { tienda: "", periodo: periodosOrdenados()[periodosOrdenados().length - 1].id };
      if (f.tienda && !porId(estado.tiendas, f.tienda)) f.tienda = "";
      return f;
    },
    guardarFiltro: function (f) { escribir("recuenta.filtro", JSON.stringify(f)); }
  };

  cargar();
  window.RC = API;
})();

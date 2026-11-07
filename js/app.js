/*
 * ReCuenta - Interfaz (vistas, navegación por perfil y acciones).
 * Navegación por hash (#/inicio, #/entregas...) para que funcione en GitHub Pages y abriendo el archivo directamente.
 */
(function () {
  "use strict";

  // ---------------- Usuarios de demostración ----------------
  var USUARIOS = {
    admin: { perfil: "admin", nombre: "Andrea Salazar", rol: "Administrador", correo: "admin@recuenta.demo", clave: "admin123" },
    repartidor: { perfil: "repartidor", nombre: "Jorge Cedeño", rol: "Repartidor", correo: "repartidor@recuenta.demo", clave: "ruta123" },
    contador: { perfil: "contador", nombre: "María Torres", rol: "Contador", correo: "contador@recuenta.demo", clave: "cuenta123" }
  };

  var MODULOS = [
    { id: "inicio", nombre: "Inicio", icono: "i-inicio", perfiles: ["admin", "repartidor", "contador"] },
    { id: "catalogo", nombre: "Tiendas y productos", icono: "i-catalogo", perfiles: ["admin", "contador"] },
    { id: "entregas", nombre: "Entregas", icono: "i-entregas", perfiles: ["admin", "repartidor"] },
    { id: "ventas", nombre: "Ventas", icono: "i-ventas", perfiles: ["admin", "repartidor"] },
    { id: "devoluciones", nombre: "Devoluciones", icono: "i-devoluciones", perfiles: ["admin", "repartidor"] },
    { id: "conciliacion", nombre: "Conciliación", icono: "i-conciliacion", perfiles: ["admin", "repartidor", "contador"] },
    { id: "liquidacion", nombre: "Liquidación", icono: "i-liquidacion", perfiles: ["admin", "contador"] }
  ];
  // Acciones permitidas por perfil
  var PERMISOS = {
    admin: { catalogoEditar: true, movimientos: true, conteo: true, revisar: true, cerrar: true },
    repartidor: { catalogoEditar: false, movimientos: true, conteo: true, revisar: false, cerrar: false },
    contador: { catalogoEditar: false, movimientos: false, conteo: true, revisar: true, cerrar: true }
  };

  var CONDICIONES = { apta: "Apta para reventa", danada: "Dañada", vencida: "Vencida" };
  var ESTADOS = {
    pendiente: { txt: "Pendiente de conteo", cls: "estado-pendiente" },
    conciliado: { txt: "Conciliado", cls: "estado-ok" },
    diferencia: { txt: "Diferencia por revisar", cls: "estado-alerta" },
    revisada: { txt: "Diferencia revisada", cls: "estado-revisada" }
  };

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var usuario = null;
  var filtro = null;
  var edicion = { entregas: null, ventas: null, devoluciones: null, tienda: null, producto: null };
  var pestanaCatalogo = "tiendas";
  var filtroEstado = "";
  var abierta = null; // fila de conciliación con observación abierta

  // ---------------- Utilidades de formato ----------------
  var fmtUSD = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
  function usd(n) { n = n || 0; return n < 0 ? "−" + fmtUSD.format(-n) : fmtUSD.format(n); }
  function num(n) { return (n === null || n === undefined) ? "—" : new Intl.NumberFormat("es-EC").format(n); }
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fecha(f) { if (!f) return "—"; var p = f.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function ico(id, cls) { return '<svg class="ico ' + (cls || "") + '"><use href="#' + id + '"/></svg>'; }
  function tienda(id) { return RC.porId(RC.get().tiendas, id) || { nombre: "(eliminada)" }; }
  function producto(id) { return RC.porId(RC.get().productos, id) || { nombre: "(eliminado)" }; }
  function periodo(id) { return RC.porId(RC.get().periodos, id) || { nombre: id }; }
  function puede(accion) { return !!PERMISOS[usuario.perfil][accion]; }
  function fechaPorDefecto(per) {
    var hoy = new Date();
    var h = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");
    return h.slice(0, 7) === per ? h : per + "-01";
  }
  function rangoPeriodo(per) {
    var y = Number(per.slice(0, 4)), m = Number(per.slice(5, 7));
    var ult = new Date(y, m, 0).getDate();
    return { min: per + "-01", max: per + "-" + String(ult).padStart(2, "0") };
  }

  // ---------------- Avisos y confirmaciones ----------------
  function toast(msg, tipo) {
    var t = document.createElement("div");
    t.className = "toast " + (tipo === "error" ? "toast-error" : "toast-ok");
    t.innerHTML = ico(tipo === "error" ? "i-alerta" : "i-ok") + "<span>" + esc(msg) + "</span>";
    $("#toasts").appendChild(t);
    setTimeout(function () { t.classList.add("salir"); }, 3200);
    setTimeout(function () { t.remove(); }, 3700);
  }
  function confirmar(titulo, texto, textoSi) {
    return new Promise(function (resolver) {
      var m = $("#modal");
      $("#modal-titulo").textContent = titulo;
      $("#modal-texto").textContent = texto;
      $("#modal-si").textContent = textoSi || "Confirmar";
      m.hidden = false;
      $("#modal-si").focus();
      function fin(v) { m.hidden = true; $("#modal-si").onclick = null; $("#modal-no").onclick = null; document.removeEventListener("keydown", esc_); resolver(v); }
      function esc_(e) { if (e.key === "Escape") fin(false); }
      $("#modal-si").onclick = function () { fin(true); };
      $("#modal-no").onclick = function () { fin(false); };
      document.addEventListener("keydown", esc_);
    });
  }
  function mostrarError(form, e) {
    var box = $(".error-form", form);
    $$(".invalido", form).forEach(function (x) { x.classList.remove("invalido"); });
    if (box) box.textContent = e.message;
    if (e.campo) {
      var campo = form.querySelector('[name="' + e.campo + '"]') || form.querySelector('[data-campo="' + e.campo + '"]');
      if (campo) { campo.classList.add("invalido"); if (campo.focus) campo.focus(); }
    }
    toast(e.message, "error");
  }

  // Evita guardar dos veces por doble clic: bloquea el formulario mientras procesa.
  var ultimoGuardado = {};
  function enviarUnaVez(form, fn) {
    var clave = form.id || (form.className + "|" + (form.dataset.k || ""));
    if (form.dataset.ocupado === "1" || Date.now() - (ultimoGuardado[clave] || 0) < 700) return;
    form.dataset.ocupado = "1";
    var btn = $('[type="submit"]', form);
    if (btn) btn.disabled = true;
    try {
      fn();
      ultimoGuardado[clave] = Date.now();
      // Tras guardar, el formulario sigue bloqueado un instante para absorber un segundo clic.
      setTimeout(function () { if (document.body.contains(form)) { form.dataset.ocupado = ""; if (btn) btn.disabled = false; } }, 600);
    } catch (e) {
      form.dataset.ocupado = "";
      if (btn) btn.disabled = false;
      if (e && e.message) mostrarError(form, e); else throw e;
    }
  }

  // ---------------- Sesión ----------------
  function entrar(perfil) {
    usuario = USUARIOS[perfil];
    RC.iniciarSesion({ perfil: perfil });
    location.hash = "#/inicio";
    arrancar();
  }
  function salir() {
    RC.cerrarSesion();
    usuario = null;
    location.hash = "";
    arrancar();
  }

  // ---------------- Contexto (tienda y período activos) ----------------
  function pintarContexto() {
    var d = RC.get();
    var st = $("#f-tienda"), sp = $("#f-periodo");
    st.innerHTML = '<option value="">Todas las tiendas</option>' + d.tiendas.map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === filtro.tienda ? " selected" : "") + ">" + esc(t.nombre) + (t.activa ? "" : " (inactiva)") + "</option>";
    }).join("");
    sp.innerHTML = RC.periodosOrdenados().map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === filtro.periodo ? " selected" : "") + ">" + esc(p.nombre) + "</option>";
    }).join("");
    var chip = $("#ctx-estado");
    if (filtro.tienda && RC.cerrado(filtro.tienda, filtro.periodo)) { chip.className = "chip chip-cerrado"; chip.innerHTML = ico("i-candado") + "Liquidación cerrada"; }
    else { chip.className = "chip chip-abierto"; chip.textContent = "Período abierto"; }
  }
  function cambiarFiltro(cambios) {
    filtro = Object.assign({}, filtro, cambios);
    RC.guardarFiltro(filtro);
    Object.keys(edicion).forEach(function (k) { edicion[k] = null; });
    abierta = null;
    render();
  }

  // ---------------- Navegación ----------------
  function moduloActual() {
    var id = (location.hash || "").replace(/^#\/?/, "").split("?")[0] || "inicio";
    var m = MODULOS.filter(function (x) { return x.id === id; })[0];
    if (!m || m.perfiles.indexOf(usuario.perfil) < 0) return MODULOS[0];
    return m;
  }
  function pintarNav(actual) {
    $("#nav").innerHTML = MODULOS.filter(function (m) { return m.perfiles.indexOf(usuario.perfil) >= 0; }).map(function (m) {
      return '<a class="btn-nav' + (m.id === actual.id ? " activo" : "") + '" href="#/' + m.id + '"' + (m.id === actual.id ? ' aria-current="page"' : "") + ">" + ico(m.icono) + "<span>" + m.nombre + "</span></a>";
    }).join("");
    $("#usuario").innerHTML = '<div class="avatar">' + ico("i-" + usuario.perfil) + "</div><div><strong>" + esc(usuario.nombre) + "</strong><small>" + usuario.rol + "</small></div>";
  }
  function irA(mod, cambios) {
    if (cambios) { filtro = Object.assign({}, filtro, cambios); RC.guardarFiltro(filtro); }
    if (location.hash === "#/" + mod) render(); else location.hash = "#/" + mod;
  }

  function render() {
    if (!usuario) return;
    var m = moduloActual();
    pintarNav(m);
    pintarContexto();
    document.title = m.nombre + " · ReCuenta";
    // Se reemplaza el contenedor en cada render para no acumular manejadores de eventos.
    var anterior = $("#vista"), vista = anterior.cloneNode(false);
    anterior.parentNode.replaceChild(vista, anterior);
    vista.innerHTML = VISTAS[m.id]();
    if (ENLACES[m.id]) ENLACES[m.id](vista);
    document.body.classList.remove("menu-abierto");
  }

  function encabezado(titulo, texto, extra) {
    return '<div class="encabezado"><div><h1>' + titulo + "</h1><p>" + texto + "</p></div>" + (extra || "") + "</div>";
  }
  function vacio(icono, titulo, texto, accionHtml) {
    return '<div class="vacio">' + ico(icono, "ico-xl") + "<h3>" + titulo + "</h3><p>" + texto + "</p>" + (accionHtml || "") + "</div>";
  }
  function insignia(est) { var e = ESTADOS[est]; return '<span class="estado ' + e.cls + '">' + e.txt + "</span>"; }
  function opcionesTiendas(sel, soloActivas) {
    return '<option value="">Selecciona…</option>' + RC.get().tiendas.filter(function (t) { return !soloActivas || t.activa || t.id === sel; }).map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === sel ? " selected" : "") + ">" + esc(t.nombre) + "</option>";
    }).join("");
  }
  function opcionesProductos(sel) {
    return '<option value="">Selecciona…</option>' + RC.get().productos.filter(function (p) { return p.activo || p.id === sel; }).map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === sel ? " selected" : "") + ">" + esc(p.nombre) + "</option>";
    }).join("");
  }
  function avisoCerrado() {
    if (filtro.tienda && RC.cerrado(filtro.tienda, filtro.periodo))
      return '<div class="nota nota-info">' + ico("i-candado") + "La liquidación de <b>" + esc(tienda(filtro.tienda).nombre) + "</b> para " + esc(periodo(filtro.periodo).nombre) + " está cerrada. Sus movimientos ya no se pueden modificar.</div>";
    return "";
  }

  // Habilita o bloquea el botón Guardar según la tienda elegida en el formulario.
  function vigilarCierre(form) {
    if (!form || !form.tiendaId) return;
    function revisar() {
      var cerr = form.tiendaId.value && RC.cerrado(form.tiendaId.value, filtro.periodo);
      var btn = $('[type="submit"]', form);
      if (btn && form.dataset.ocupado !== "1") btn.disabled = !!cerr;
      var aviso = $(".aviso-cierre", form);
      if (!aviso) { aviso = document.createElement("p"); aviso.className = "ayuda aviso-cierre"; $(".form-acciones", form).before(aviso); }
      aviso.textContent = cerr ? "La liquidación de esta tienda en " + periodo(filtro.periodo).nombre + " está cerrada: elige otra tienda." : "";
    }
    form.tiendaId.addEventListener("change", revisar);
    revisar();
  }

  var VISTAS = {}, ENLACES = {};

  // ================= INICIO =================
  VISTAS.inicio = function () {
    var d = RC.get(), per = filtro.periodo;
    var tiendas = d.tiendas.filter(function (t) { return t.activa && (!filtro.tienda || t.id === filtro.tienda); });
    var filas = RC.filasConciliacion(filtro.tienda, per);
    var unidades = filas.reduce(function (a, f) { return a + Math.max(f.esperado, 0); }, 0);
    var difs = filas.filter(function (f) { return f.estado === "diferencia"; }).length;
    var pend = filas.filter(function (f) { return f.estado === "pendiente"; }).length;
    var porCobrar = 0;
    var resumen = tiendas.map(function (t) {
      var liq = RC.liquidacion(t.id, per);
      var fs = filas.filter(function (f) { return f.tiendaId === t.id; });
      if (liq.estado !== "Cerrada") porCobrar = RC.r2(porCobrar + liq.total);
      return { t: t, liq: liq, unidades: fs.reduce(function (a, f) { return a + Math.max(f.esperado, 0); }, 0),
        pend: fs.filter(function (f) { return f.estado === "pendiente"; }).length,
        difs: fs.filter(function (f) { return f.estado === "diferencia"; }).length, movs: fs.length };
    });
    var tot = { e: 0, v: 0, d: 0 };
    filas.forEach(function (f) { tot.e += f.entregas; tot.v += f.ventas; tot.d += f.devoluciones; });

    var tarjetas =
      '<div class="kpis">' +
      kpi("Tiendas activas", tiendas.length, filtro.tienda ? "Filtrada por la tienda activa" : "Con consignación en el período", "catalogo", "i-catalogo") +
      kpi("Unidades en consignación", num(unidades), "Saldo esperado en las tiendas", "conciliacion", "i-entregas", "") +
      kpi("Diferencias por revisar", difs, pend + " producto(s) pendientes de conteo", "conciliacion", "i-alerta", difs ? "kpi-alerta" : "", "diferencia") +
      kpi("Total por cobrar", usd(porCobrar), "Ventas reportadas sin liquidación cerrada", "liquidacion", "i-liquidacion", "kpi-dinero") +
      "</div>";

    var flujo = '<section class="tarjeta"><h2 class="tarjeta-titulo">Recorrido de la consignación · ' + esc(periodo(per).nombre) + '</h2><div class="flujo">' +
      paso("1", "Entrega", num(tot.e) + " u.", "entregas") + paso("2", "Venta reportada", num(tot.v) + " u.", "ventas") +
      paso("3", "Devolución", num(tot.d) + " u.", "devoluciones") + paso("4", "Conciliación", difs + " por revisar", "conciliacion") +
      paso("5", "Liquidación", usd(porCobrar), "liquidacion") + "</div></section>";

    var tabla = resumen.length ? '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Tienda</th><th class="num">Unidades en tienda</th><th class="num">Pendientes de conteo</th><th class="num">Diferencias</th><th class="num">Por cobrar</th><th>Liquidación</th><th></th></tr></thead><tbody>' +
      resumen.map(function (r) {
        return "<tr><td><strong>" + esc(r.t.nombre) + "</strong><small class='sub'>" + esc(r.t.direccion) + "</small></td><td class='num'>" + num(r.unidades) + "</td><td class='num'>" + r.pend +
          "</td><td class='num'>" + (r.difs ? '<span class="estado estado-alerta">' + r.difs + "</span>" : "0") + "</td><td class='num'>" + usd(r.liq.total) + "</td><td>" + insigniaLiq(r.liq.estado) +
          '</td><td class="acciones"><button class="btn btn-mini" data-accion="ver-tienda" data-id="' + r.t.id + '">Conciliar ' + ico("i-flecha") + "</button></td></tr>";
      }).join("") + "</tbody></table></div>" : vacio("i-catalogo", "Aún no hay tiendas activas", "Agrega una tienda para empezar a registrar entregas.", usuario.perfil === "admin" ? '<a class="btn btn-primario" href="#/catalogo">' + ico("i-mas") + "Agregar tienda</a>" : "");

    return encabezado("Hola, " + esc(usuario.nombre.split(" ")[0]), "Resumen de " + esc(periodo(per).nombre) + (filtro.tienda ? " · " + esc(tienda(filtro.tienda).nombre) : " · todas las tiendas") + ".") +
      tarjetas + flujo + '<section class="tarjeta"><h2 class="tarjeta-titulo">Estado por tienda</h2>' + tabla + "</section>";

    function kpi(t, v, s, destino, icono, cls, estado) {
      var permitido = MODULOS.filter(function (m) { return m.id === destino; })[0].perfiles.indexOf(usuario.perfil) >= 0;
      return '<button class="kpi ' + (cls || "") + '" ' + (permitido ? 'data-accion="ir" data-destino="' + destino + '" data-estado="' + (estado || "") + '"' : "disabled") + '>' +
        '<span class="kpi-ico">' + ico(icono) + '</span><span class="kpi-txt"><span class="kpi-titulo">' + t + '</span><span class="kpi-valor">' + v + '</span><span class="kpi-sub">' + s + "</span></span></button>";
    }
    function paso(n, t, v, destino) {
      var permitido = MODULOS.filter(function (m) { return m.id === destino; })[0].perfiles.indexOf(usuario.perfil) >= 0;
      return '<button class="paso" ' + (permitido ? 'data-accion="ir" data-destino="' + destino + '"' : "disabled") + '><span class="paso-n">' + n + "</span><span><b>" + t + "</b><small>" + v + "</small></span></button>";
    }
  };
  function insigniaLiq(e) {
    var cls = e === "Cerrada" ? "estado-ok" : (e === "Preliminar" ? "estado-pendiente" : "estado-revisada");
    return '<span class="estado ' + cls + '">' + e + "</span>";
  }
  ENLACES.inicio = function (v) {
    v.addEventListener("click", function (e) {
      var b = e.target.closest("[data-accion]");
      if (!b) return;
      if (b.dataset.accion === "ir") { if (b.dataset.estado) filtroEstado = b.dataset.estado; irA(b.dataset.destino); }
      if (b.dataset.accion === "ver-tienda") { filtroEstado = ""; irA("conciliacion", { tienda: b.dataset.id }); }
    });
  };

  // ================= CATÁLOGO =================
  VISTAS.catalogo = function () {
    var editar = puede("catalogoEditar");
    var tabs = '<div class="pestanas" role="tablist">' + [["tiendas", "Tiendas"], ["productos", "Productos y precios"], ["periodos", "Períodos"]].map(function (p) {
      return '<button role="tab" class="pestana' + (pestanaCatalogo === p[0] ? " activa" : "") + '" data-accion="pestana" data-id="' + p[0] + '" aria-selected="' + (pestanaCatalogo === p[0]) + '">' + p[1] + "</button>";
    }).join("") + "</div>";
    var cuerpo = pestanaCatalogo === "tiendas" ? vistaTiendas(editar) : pestanaCatalogo === "productos" ? vistaProductos(editar) : vistaPeriodos(editar);
    return encabezado("Tiendas y productos", editar ? "Los cambios aparecen de inmediato en los formularios de entregas, ventas y devoluciones." : "Consulta del catálogo. Solo el administrador puede modificarlo.") + tabs + cuerpo;
  };
  function vistaTiendas(editar) {
    var d = RC.get(), t = edicion.tienda ? RC.porId(d.tiendas, edicion.tienda) : null;
    var form = editar ? '<form class="tarjeta form" id="form-tienda" novalidate><h2 class="tarjeta-titulo">' + (t ? "Editar tienda" : "Nueva tienda") + "</h2>" +
      '<div class="rejilla-2">' +
      campo("Nombre de la tienda *", '<input name="nombre" required maxlength="60" value="' + esc(t ? t.nombre : "") + '" placeholder="Ej.: Despensa La Esquina">') +
      campo("Persona de contacto", '<input name="contacto" maxlength="60" value="' + esc(t ? t.contacto : "") + '">') +
      campo("Dirección", '<input name="direccion" maxlength="90" value="' + esc(t ? t.direccion : "") + '" placeholder="Calle, sector, Milagro">', "ancho") +
      campo("Teléfono", '<input name="telefono" inputmode="tel" maxlength="15" value="' + esc(t ? t.telefono : "") + '">') +
      campo("Estado", '<select name="activa"><option value="1">Activa</option><option value="0"' + (t && !t.activa ? " selected" : "") + ">Inactiva</option></select>") +
      campo("Ajuste pactado (%)", '<input name="ajustePct" type="number" min="0" max="50" step="0.1" value="' + (t ? t.ajustePct : 0) + '">') +
      campo("Nombre del ajuste", '<input name="ajusteNombre" maxlength="40" value="' + esc(t ? t.ajusteNombre : "") + '" placeholder="Ej.: Descuento por exhibición">') +
      '</div><p class="ayuda">El ajuste pactado se descuenta del subtotal de la liquidación de esta tienda.</p><p class="error-form" role="alert"></p><div class="form-acciones">' +
      (t ? '<button type="button" class="btn btn-secundario" data-accion="cancelar-tienda">Cancelar edición</button>' : "") +
      '<button class="btn btn-primario" type="submit">' + ico(t ? "i-ok" : "i-mas") + (t ? "Guardar cambios" : "Agregar tienda") + "</button></div></form>" : "";
    var tabla = d.tiendas.length ? '<div class="tarjeta"><h2 class="tarjeta-titulo">Tiendas registradas (' + d.tiendas.length + ')</h2><div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Tienda</th><th>Contacto</th><th>Ajuste pactado</th><th>Estado</th>' + (editar ? "<th></th>" : "") + "</tr></thead><tbody>" +
      d.tiendas.map(function (x) {
        return "<tr><td><strong>" + esc(x.nombre) + "</strong><small class='sub'>" + esc(x.direccion || "Sin dirección") + "</small></td><td>" + esc(x.contacto || "—") + "<small class='sub'>" + esc(x.telefono || "") + "</small></td><td>" +
          (x.ajustePct ? x.ajustePct + " % · " + esc(x.ajusteNombre) : "Sin ajuste") + "</td><td>" + (x.activa ? '<span class="estado estado-ok">Activa</span>' : '<span class="estado estado-gris">Inactiva</span>') + "</td>" +
          (editar ? '<td class="acciones"><button class="btn btn-mini" data-accion="editar-tienda" data-id="' + x.id + '">' + ico("i-editar") + "Editar</button></td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div></div>" : vacio("i-catalogo", "No hay tiendas", "Registra la primera tienda que recibe mercadería en consignación.");
    return '<div class="dos-columnas">' + form + tabla + "</div>";
  }
  function vistaProductos(editar) {
    var d = RC.get(), p = edicion.producto ? RC.porId(d.productos, edicion.producto) : null, per = filtro.periodo;
    var form = editar ? '<form class="tarjeta form" id="form-producto" novalidate><h2 class="tarjeta-titulo">' + (p ? "Editar producto" : "Nuevo producto") + "</h2>" +
      '<div class="rejilla-2">' +
      campo("Nombre del producto *", '<input name="nombre" required maxlength="60" value="' + esc(p ? p.nombre : "") + '" placeholder="Ej.: Café molido 250 g">', "ancho") +
      campo("Código", '<input name="codigo" maxlength="12" value="' + esc(p ? p.codigo : "") + '">') +
      campo("Unidad", '<input name="unidad" maxlength="20" value="' + esc(p ? p.unidad : "unidad") + '">') +
      campo("Precio de consignación (USD) *", '<input name="precio" type="number" min="0.01" step="0.01" required value="' + (p ? RC.precioEn(p, per).toFixed(2) : "") + '">') +
      campo("Estado", '<select name="activo"><option value="1">Activo</option><option value="0"' + (p && !p.activo ? " selected" : "") + ">Inactivo</option></select>") +
      '</div><p class="ayuda">' + (p ? "Si cambias el precio, rige desde " + esc(periodo(per).nombre) + ". Los períodos anteriores y las liquidaciones cerradas conservan su precio." : "Precio que la tienda paga por cada unidad vendida.") +
      '</p><p class="error-form" role="alert"></p><div class="form-acciones">' +
      (p ? '<button type="button" class="btn btn-secundario" data-accion="cancelar-producto">Cancelar edición</button>' : "") +
      '<button class="btn btn-primario" type="submit">' + ico(p ? "i-ok" : "i-mas") + (p ? "Guardar cambios" : "Agregar producto") + "</button></div></form>" : "";
    var tabla = '<div class="tarjeta"><h2 class="tarjeta-titulo">Productos (' + d.productos.length + ")</h2>" + (d.productos.length ? '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Producto</th><th>Código</th><th class="num">Precio en ' + esc(periodo(per).nombre) + "</th><th>Estado</th>" + (editar ? "<th></th>" : "") + "</tr></thead><tbody>" +
      d.productos.map(function (x) {
        return "<tr><td><strong>" + esc(x.nombre) + "</strong><small class='sub'>por " + esc(x.unidad) + "</small></td><td>" + esc(x.codigo || "—") + "</td><td class='num'>" + usd(RC.precioEn(x, per)) + "</td><td>" +
          (x.activo ? '<span class="estado estado-ok">Activo</span>' : '<span class="estado estado-gris">Inactivo</span>') + "</td>" +
          (editar ? '<td class="acciones"><button class="btn btn-mini" data-accion="editar-producto" data-id="' + x.id + '">' + ico("i-editar") + "Editar</button></td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>" : vacio("i-catalogo", "No hay productos", "Agrega los productos que entregas en consignación.")) + "</div>";
    return '<div class="dos-columnas">' + form + tabla + "</div>";
  }
  function vistaPeriodos(editar) {
    return '<div class="tarjeta"><h2 class="tarjeta-titulo">Períodos de liquidación</h2><p class="ayuda">Cada período es un mes. El stock inicial de un período es el conteo físico registrado al cierre del anterior.</p>' +
      '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Período</th><th class="num">Liquidaciones cerradas</th></tr></thead><tbody>' +
      RC.periodosOrdenados().map(function (p) {
        var n = Object.keys(RC.get().cierres).filter(function (k) { return k.split("|")[1] === p.id; }).length;
        return "<tr><td>" + esc(p.nombre) + "</td><td class='num'>" + n + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      (editar ? '<div class="form-acciones"><button class="btn btn-primario" data-accion="nuevo-periodo">' + ico("i-mas") + "Abrir siguiente período</button></div>" : "") + "</div>";
  }
  function campo(etq, control, cls) { return '<label class="campo ' + (cls || "") + '"><span>' + etq + "</span>" + control + "</label>"; }

  ENLACES.catalogo = function (v) {
    v.addEventListener("click", function (e) {
      var b = e.target.closest("[data-accion]");
      if (!b) return;
      var a = b.dataset.accion;
      if (a === "pestana") { pestanaCatalogo = b.dataset.id; render(); }
      if (a === "editar-tienda") { edicion.tienda = b.dataset.id; render(); $("#form-tienda input").focus(); }
      if (a === "cancelar-tienda") { edicion.tienda = null; render(); }
      if (a === "editar-producto") { edicion.producto = b.dataset.id; render(); $("#form-producto input").focus(); }
      if (a === "cancelar-producto") { edicion.producto = null; render(); }
      if (a === "nuevo-periodo") {
        confirmar("Abrir nuevo período", "Se creará el mes siguiente al último período registrado. ¿Continuar?", "Abrir período").then(function (ok) {
          if (!ok) return;
          var p = RC.agregarPeriodo();
          toast("Período " + p.nombre + " abierto.");
          cambiarFiltro({ periodo: p.id });
        });
      }
    });
    var ft = $("#form-tienda", v);
    if (ft) ft.addEventListener("submit", function (e) {
      e.preventDefault();
      enviarUnaVez(ft, function () {
        var f = new FormData(ft);
        var nuevo = !edicion.tienda;
        var t = RC.guardarTienda({ id: edicion.tienda, nombre: f.get("nombre"), contacto: f.get("contacto"), direccion: f.get("direccion"), telefono: f.get("telefono"),
          ajustePct: f.get("ajustePct") === "" ? 0 : f.get("ajustePct"), ajusteNombre: f.get("ajusteNombre"), activa: f.get("activa") === "1" });
        edicion.tienda = null;
        toast(nuevo ? "Tienda «" + t.nombre + "» agregada." : "Cambios guardados en «" + t.nombre + "».");
        render();
      });
    });
    var fp = $("#form-producto", v);
    if (fp) fp.addEventListener("submit", function (e) {
      e.preventDefault();
      enviarUnaVez(fp, function () {
        var f = new FormData(fp);
        var nuevo = !edicion.producto;
        var p = RC.guardarProducto({ id: edicion.producto, nombre: f.get("nombre"), codigo: f.get("codigo"), unidad: f.get("unidad"), precio: f.get("precio"), activo: f.get("activo") === "1" }, filtro.periodo);
        edicion.producto = null;
        toast(nuevo ? "Producto «" + p.nombre + "» agregado." : "Cambios guardados en «" + p.nombre + "».");
        render();
      });
    });
  };

  // ================= ENTREGAS =================
  VISTAS.entregas = function () {
    var d = RC.get(), per = filtro.periodo, ed = edicion.entregas ? RC.porId(d.entregas, edicion.entregas) : null;
    var tSel = ed ? ed.tiendaId : filtro.tienda;
    var lineas = ed ? ed.lineas : [{ productoId: "", cantidad: "" }];
    var r = rangoPeriodo(per);
    var bloqueado = tSel && RC.cerrado(tSel, per);
    var lista = d.entregas.filter(function (e) { return e.periodo === per && (!filtro.tienda || e.tiendaId === filtro.tienda); })
      .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });

    var form = puede("movimientos") ? '<form class="tarjeta form" id="form-entrega" novalidate><h2 class="tarjeta-titulo">' + (ed ? "Corregir entrega" : "Registrar entrega") + "</h2>" +
      '<div class="rejilla-2">' +
      campo("Fecha *", '<input name="fecha" type="date" required min="' + r.min + '" max="' + r.max + '" value="' + (ed ? ed.fecha : fechaPorDefecto(per)) + '">') +
      campo("Período", '<input value="' + esc(periodo(per).nombre) + '" disabled>') +
      campo("Tienda *", '<select name="tiendaId" required>' + opcionesTiendas(tSel, true) + "</select>", "ancho") +
      '</div><div class="lineas" data-campo="lineas"><div class="lineas-cab"><span>Producto *</span><span>Cantidad *</span><span></span></div>' +
      lineas.map(function (l, i) { return lineaHtml(l, i); }).join("") + "</div>" +
      '<button type="button" class="btn btn-secundario btn-mini" data-accion="agregar-linea">' + ico("i-mas") + "Agregar producto</button>" +
      campo("Nota o número de guía", '<input name="nota" maxlength="80" value="' + esc(ed ? ed.nota : "") + '" placeholder="Ej.: Guía 0015 - ruta centro">', "ancho") +
      '<p class="error-form" role="alert"></p><div class="form-acciones">' +
      (ed ? '<button type="button" class="btn btn-secundario" data-accion="cancelar">Cancelar corrección</button>' : "") +
      '<button class="btn btn-primario" type="submit"' + (bloqueado ? " disabled" : "") + ">" + ico("i-ok") + (ed ? "Guardar corrección" : "Guardar entrega") + "</button></div></form>" : "";

    var tabla = '<div class="tarjeta"><h2 class="tarjeta-titulo">Historial de entregas · ' + esc(periodo(per).nombre) + "</h2>" + (lista.length ?
      '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fecha</th><th>Tienda</th><th>Productos</th><th class="num">Unidades</th><th>Nota</th><th></th></tr></thead><tbody>' +
      lista.map(function (e) {
        var u = e.lineas.reduce(function (a, l) { return a + l.cantidad; }, 0);
        var cerr = RC.cerrado(e.tiendaId, e.periodo);
        return "<tr" + (edicion.entregas === e.id ? ' class="fila-editando"' : "") + "><td>" + fecha(e.fecha) + "</td><td>" + esc(tienda(e.tiendaId).nombre) + "</td><td>" +
          e.lineas.map(function (l) { return esc(producto(l.productoId).nombre) + " <b>× " + num(l.cantidad) + "</b>"; }).join("<br>") + "</td><td class='num'>" + num(u) + "</td><td>" + esc(e.nota || "—") + "</td>" +
          '<td class="acciones">' + (cerr ? '<span class="estado estado-gris">' + ico("i-candado") + "Cerrada</span>" : puede("movimientos") ?
            '<button class="btn btn-mini" data-accion="editar" data-id="' + e.id + '">' + ico("i-editar") + 'Corregir</button><button class="btn btn-mini btn-peligro" data-accion="eliminar" data-id="' + e.id + '" aria-label="Eliminar entrega">' + ico("i-borrar") + "</button>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" :
      vacio("i-entregas", "Sin entregas en este período", filtro.tienda ? "Esta tienda no tiene entregas registradas en " + esc(periodo(per).nombre) + "." : "Registra la primera entrega del período.", "")) + "</div>";

    return encabezado("Entregas", "Mercadería que sale de la distribuidora hacia cada tienda en consignación.") + avisoCerrado() + '<div class="dos-columnas">' + form + tabla + "</div>";
  };
  function lineaHtml(l, i) {
    return '<div class="linea" data-i="' + i + '"><select name="producto" data-campo="linea-' + i + '" aria-label="Producto">' + opcionesProductos(l.productoId) + "</select>" +
      '<input name="cantidad" type="number" min="1" step="1" inputmode="numeric" aria-label="Cantidad" value="' + (l.cantidad || "") + '" placeholder="0">' +
      '<button type="button" class="btn-icono" data-accion="quitar-linea" aria-label="Quitar producto">' + ico("i-cerrar") + "</button></div>";
  }
  ENLACES.entregas = function (v) {
    var form = $("#form-entrega", v);
    vigilarCierre(form);
    v.addEventListener("click", function (e) {
      var b = e.target.closest("[data-accion]");
      if (!b) return;
      var a = b.dataset.accion;
      if (a === "agregar-linea") {
        var cont = $(".lineas", v);
        var div = document.createElement("div");
        div.innerHTML = lineaHtml({ productoId: "", cantidad: "" }, $$(".linea", v).length);
        cont.appendChild(div.firstChild);
      }
      if (a === "quitar-linea") {
        if ($$(".linea", v).length === 1) { toast("La entrega necesita al menos un producto.", "error"); return; }
        b.closest(".linea").remove();
      }
      if (a === "editar") { edicion.entregas = b.dataset.id; render(); $("#form-entrega").scrollIntoView({ behavior: "smooth" }); }
      if (a === "cancelar") { edicion.entregas = null; render(); }
      if (a === "eliminar") {
        var en = RC.porId(RC.get().entregas, b.dataset.id);
        confirmar("Eliminar entrega", "Se eliminará la entrega del " + fecha(en.fecha) + " a " + tienda(en.tiendaId).nombre + ". Esta acción no se puede deshacer.", "Eliminar").then(function (ok) {
          if (!ok) return;
          try { RC.eliminarEntrega(en.id); toast("Entrega eliminada."); render(); } catch (err) { toast(err.message, "error"); }
        });
      }
    });
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      enviarUnaVez(form, function () {
        var f = new FormData(form);
        var lineas = $$(".linea", form).map(function (row) {
          var c = $('[name="cantidad"]', row).value;
          return { productoId: $('[name="producto"]', row).value, cantidad: c === "" ? NaN : Number(c) };
        });
        var editando = !!edicion.entregas;
        var r = RC.guardarEntrega({ id: edicion.entregas, fecha: f.get("fecha"), periodo: filtro.periodo, tiendaId: f.get("tiendaId"), lineas: lineas, nota: f.get("nota") });
        edicion.entregas = null;
        var u = r.lineas.reduce(function (a, l) { return a + l.cantidad; }, 0);
        toast((editando ? "Entrega corregida: " : "Entrega guardada: ") + u + " u. para " + tienda(r.tiendaId).nombre + ".");
        if (!filtro.tienda) cambiarFiltro({ tienda: r.tiendaId }); else render();
      });
    });
  };

  // ================= VENTAS y DEVOLUCIONES =================
  function vistaMovimiento(tipo) {
    var d = RC.get(), per = filtro.periodo, esVenta = tipo === "ventas";
    var ed = edicion[tipo] ? RC.porId(d[tipo], edicion[tipo]) : null;
    var tSel = ed ? ed.tiendaId : filtro.tienda;
    var r = rangoPeriodo(per);
    var bloqueado = tSel && RC.cerrado(tSel, per);
    var lista = d[tipo].filter(function (x) { return x.periodo === per && (!filtro.tienda || x.tiendaId === filtro.tienda); })
      .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    var titulo = esVenta ? "Ventas reportadas" : "Devoluciones";
    var texto = esVenta ? "Unidades que cada tienda informa como vendidas. Son la base de la liquidación." : "Unidades que el repartidor retira de la tienda. Cada unidad se descuenta una sola vez del saldo y no se cobra a la tienda.";

    var form = puede("movimientos") ? '<form class="tarjeta form" id="form-mov" novalidate><h2 class="tarjeta-titulo">' + (ed ? "Corregir registro" : (esVenta ? "Registrar venta reportada" : "Registrar devolución")) + "</h2>" +
      '<div class="rejilla-2">' +
      campo("Fecha *", '<input name="fecha" type="date" required min="' + r.min + '" max="' + r.max + '" value="' + (ed ? ed.fecha : fechaPorDefecto(per)) + '">') +
      campo("Período", '<input value="' + esc(periodo(per).nombre) + '" disabled>') +
      campo("Tienda *", '<select name="tiendaId" required>' + opcionesTiendas(tSel, true) + "</select>", "ancho") +
      campo("Producto *", '<select name="productoId" required>' + opcionesProductos(ed ? ed.productoId : "") + "</select>", "ancho") +
      campo("Cantidad *", '<input name="cantidad" type="number" min="1" step="1" inputmode="numeric" required value="' + (ed ? ed.cantidad : "") + '" placeholder="0">') +
      (esVenta ? "" : campo("Condición *", '<select name="condicion" required><option value="">Selecciona…</option>' + Object.keys(CONDICIONES).map(function (k) {
        return '<option value="' + k + '"' + (ed && ed.condicion === k ? " selected" : "") + ">" + CONDICIONES[k] + "</option>";
      }).join("") + "</select>")) +
      '</div><p class="disponible" id="disponible"></p>' +
      (esVenta ? "" : '<p class="ayuda">Aptas: regresan a la bodega para reventa. Dañadas o vencidas: se registran como merma de la distribuidora. Ninguna se cobra a la tienda.</p>') +
      '<p class="error-form" role="alert"></p><div class="form-acciones">' +
      (ed ? '<button type="button" class="btn btn-secundario" data-accion="cancelar">Cancelar corrección</button>' : "") +
      '<button class="btn btn-primario" type="submit"' + (bloqueado ? " disabled" : "") + ">" + ico("i-ok") + (ed ? "Guardar corrección" : "Guardar") + "</button></div></form>" : "";

    var tabla = '<div class="tarjeta"><h2 class="tarjeta-titulo">Historial · ' + esc(periodo(per).nombre) + "</h2>" + (lista.length ?
      '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fecha</th><th>Tienda</th><th>Producto</th><th class="num">Cantidad</th>' + (esVenta ? '<th class="num">Importe</th>' : "<th>Condición</th>") + "<th></th></tr></thead><tbody>" +
      lista.map(function (x) {
        var cerr = RC.cerrado(x.tiendaId, x.periodo);
        var p = producto(x.productoId);
        return "<tr" + (edicion[tipo] === x.id ? ' class="fila-editando"' : "") + "><td>" + fecha(x.fecha) + "</td><td>" + esc(tienda(x.tiendaId).nombre) + "</td><td>" + esc(p.nombre) + "</td><td class='num'>" + num(x.cantidad) + "</td>" +
          (esVenta ? "<td class='num'>" + usd(RC.r2(x.cantidad * RC.precioEn(p, x.periodo))) + "</td>" : '<td><span class="estado ' + (x.condicion === "apta" ? "estado-ok" : "estado-pendiente") + '">' + CONDICIONES[x.condicion] + "</span></td>") +
          '<td class="acciones">' + (cerr ? '<span class="estado estado-gris">' + ico("i-candado") + "Cerrada</span>" : puede("movimientos") ?
            '<button class="btn btn-mini" data-accion="editar" data-id="' + x.id + '">' + ico("i-editar") + 'Corregir</button><button class="btn btn-mini btn-peligro" data-accion="eliminar" data-id="' + x.id + '" aria-label="Eliminar registro">' + ico("i-borrar") + "</button>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" :
      vacio(esVenta ? "i-ventas" : "i-devoluciones", esVenta ? "Sin ventas reportadas" : "Sin devoluciones", "No hay registros para " + (filtro.tienda ? esc(tienda(filtro.tienda).nombre) + " en " : "") + esc(periodo(per).nombre) + ".", "")) + "</div>";

    return encabezado(titulo, texto) + avisoCerrado() + '<div class="dos-columnas">' + form + tabla + "</div>";
  }
  function enlazarMovimiento(tipo) {
    return function (v) {
      var form = $("#form-mov", v);
      function actualizarDisponible() {
        if (!form) return;
        var t = form.tiendaId.value, p = form.productoId.value, out = $("#disponible", v);
        if (!t || !p) { out.textContent = ""; return; }
        var excl = {}; excl[tipo === "ventas" ? "venta" : "devolucion"] = edicion[tipo];
        var disp = RC.disponible(t, p, filtro.periodo, excl);
        out.innerHTML = "Disponible en la tienda: <b>" + num(Math.max(disp, 0)) + " u.</b> de " + esc(producto(p).nombre);
      }
      if (form) {
        vigilarCierre(form);
        form.addEventListener("change", actualizarDisponible);
        actualizarDisponible();
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          enviarUnaVez(form, function () {
            var f = new FormData(form);
            var c = f.get("cantidad");
            var editando = !!edicion[tipo];
            var r = RC.guardarMovimiento(tipo, { id: edicion[tipo], fecha: f.get("fecha"), periodo: filtro.periodo, tiendaId: f.get("tiendaId"), productoId: f.get("productoId"),
              cantidad: c === "" ? NaN : Number(c), condicion: f.get("condicion") });
            edicion[tipo] = null;
            toast((editando ? "Registro corregido: " : (tipo === "ventas" ? "Venta guardada: " : "Devolución guardada: ")) + r.cantidad + " u. de " + producto(r.productoId).nombre + ".");
            if (!filtro.tienda) cambiarFiltro({ tienda: r.tiendaId }); else render();
          });
        });
      }
      v.addEventListener("click", function (e) {
        var b = e.target.closest("[data-accion]");
        if (!b) return;
        if (b.dataset.accion === "editar") { edicion[tipo] = b.dataset.id; render(); $("#form-mov").scrollIntoView({ behavior: "smooth" }); }
        if (b.dataset.accion === "cancelar") { edicion[tipo] = null; render(); }
        if (b.dataset.accion === "eliminar") {
          var reg = RC.porId(RC.get()[tipo], b.dataset.id);
          confirmar("Eliminar registro", "Se eliminarán " + reg.cantidad + " u. de " + producto(reg.productoId).nombre + " (" + tienda(reg.tiendaId).nombre + "). El saldo y la liquidación se recalcularán.", "Eliminar").then(function (ok) {
            if (!ok) return;
            try { RC.eliminarMovimiento(tipo, reg.id); toast("Registro eliminado."); render(); } catch (err) { toast(err.message, "error"); }
          });
        }
      });
    };
  }
  VISTAS.ventas = function () { return vistaMovimiento("ventas"); };
  VISTAS.devoluciones = function () { return vistaMovimiento("devoluciones"); };
  ENLACES.ventas = enlazarMovimiento("ventas");
  ENLACES.devoluciones = enlazarMovimiento("devoluciones");

  // ================= CONCILIACIÓN =================
  VISTAS.conciliacion = function () {
    var per = filtro.periodo;
    var filas = RC.filasConciliacion(filtro.tienda, per);
    var cuenta = { pendiente: 0, conciliado: 0, diferencia: 0, revisada: 0 };
    filas.forEach(function (f) { cuenta[f.estado]++; });
    var visibles = filas.filter(function (f) { return !filtroEstado || f.estado === filtroEstado; });
    var chips = '<div class="filtros" role="group" aria-label="Filtrar por estado">' + [["", "Todos", filas.length], ["pendiente", "Pendiente de conteo", cuenta.pendiente], ["diferencia", "Diferencia por revisar", cuenta.diferencia], ["revisada", "Revisada", cuenta.revisada], ["conciliado", "Conciliado", cuenta.conciliado]].map(function (c) {
      return '<button class="filtro' + (filtroEstado === c[0] ? " activo" : "") + '" data-accion="filtro-estado" data-id="' + c[0] + '">' + c[1] + " <b>" + c[2] + "</b></button>";
    }).join("") + "</div>";

    var tabla = visibles.length ? '<div class="tabla-envoltura"><table class="tabla tabla-conciliacion"><thead><tr>' + (filtro.tienda ? "" : "<th>Tienda</th>") + '<th>Producto</th><th class="num">Inicial</th><th class="num">Entregas</th><th class="num">Ventas</th><th class="num">Devoluciones</th><th class="num">Saldo esperado</th><th class="num">Conteo físico</th><th class="num">Diferencia</th><th>Estado y revisión</th></tr></thead><tbody>' +
      visibles.map(function (f) {
        var k = f.tiendaId + "|" + f.productoId;
        var cerr = RC.cerrado(f.tiendaId, per);
        var dif = f.diferencia === null ? "—" : (f.diferencia === 0 ? "0" : (f.diferencia < 0 ? '<span class="neg">−' + (-f.diferencia) + '</span><small class="sub">faltan ' + (-f.diferencia) + "</small>" : '<span class="pos">+' + f.diferencia + '</span><small class="sub">sobran ' + f.diferencia + "</small>"));
        var conteo = (puede("conteo") && !cerr) ?
          '<form class="form-conteo" data-k="' + k + '" novalidate><input name="conteo" type="number" min="0" step="1" inputmode="numeric" aria-label="Conteo físico" value="' + (f.conteo === null ? "" : f.conteo) + '" placeholder="—"><button class="btn btn-mini btn-primario" type="submit">Guardar</button></form>' : num(f.conteo);
        var devDet = f.devoluciones ? '<small class="sub">' + [f.devAptas ? f.devAptas + " aptas" : "", f.devDanadas ? f.devDanadas + " dañadas" : "", f.devVencidas ? f.devVencidas + " vencidas" : ""].filter(Boolean).join(" · ") + "</small>" : "";
        var obs = f.conteo === null ? '<span class="sub">Registra el conteo</span>' :
          '<button class="btn btn-mini" data-accion="obs" data-k="' + k + '">' + ico("i-editar") + (f.observacion ? "Ver / editar" : "Agregar") + "</button>" + (f.observacion ? '<small class="sub obs-txt">' + esc(f.observacion) + "</small>" : "");
        var html = "<tr class='" + (f.estado === "diferencia" ? "fila-alerta" : "") + "'>" + (filtro.tienda ? "" : "<td>" + esc(tienda(f.tiendaId).nombre) + "</td>") + "<td class='nombre'>" + esc(producto(f.productoId).nombre) + "</td><td class='num'>" + num(f.inicial) + "</td><td class='num'>" + num(f.entregas) +
          "</td><td class='num'>" + num(f.ventas) + "</td><td class='num'>" + num(f.devoluciones) + devDet + "</td><td class='num'><b>" + num(f.esperado) + "</b></td><td class='num'>" + conteo + "</td><td class='num'>" + dif +
          "</td><td class='col-estado'>" + insignia(f.estado) + "<div class='obs'>" + obs + "</div></td></tr>";
        if (abierta === k) {
          html += '<tr class="fila-detalle"><td colspan="' + (filtro.tienda ? 9 : 10) + '"><form class="form-obs" data-k="' + k + '" novalidate><label class="campo ancho"><span>Observación para la revisión</span><textarea name="observacion" rows="2" maxlength="200" placeholder="Ej.: La tienda informa 5 fundas sin reportar; se verificará en la próxima visita.">' + esc(f.observacion) + "</textarea></label>" +
            '<p class="error-form" role="alert"></p><div class="form-acciones"><button type="button" class="btn btn-secundario" data-accion="cerrar-obs">Cancelar</button><button class="btn btn-secundario" type="submit" data-modo="guardar">Guardar observación</button>' +
            (f.diferencia !== 0 && puede("revisar") ? (f.estado === "revisada" ? '<button class="btn btn-secundario" type="submit" data-modo="reabrir">Volver a «por revisar»</button>' : '<button class="btn btn-primario" type="submit" data-modo="revisar">' + ico("i-ok") + "Marcar diferencia como revisada</button>") : "") +
            "</div></form></td></tr>";
        }
        return html;
      }).join("") + "</tbody></table></div>" :
      vacio("i-conciliacion", filas.length ? "No hay productos con este estado" : "Sin movimientos para conciliar", filas.length ? "Cambia el filtro de estado para ver los demás productos." : "Registra una entrega en el período para empezar.", filas.length ? "" : (puede("movimientos") ? '<a class="btn btn-primario" href="#/entregas">' + ico("i-mas") + "Registrar entrega</a>" : ""));

    return encabezado("Conciliación", "Saldo esperado = inicial + entregas − ventas − devoluciones. Se compara con el conteo físico en la tienda.") + avisoCerrado() +
      '<section class="tarjeta">' + chips + tabla + '<p class="ayuda">Una diferencia se revisa antes de considerarla pérdida: no se cobra automáticamente a la tienda.' + (puede("revisar") ? "" : " La revisión la confirma el contador o el administrador.") + "</p></section>";
  };
  ENLACES.conciliacion = function (v) {
    v.addEventListener("click", function (e) {
      var b = e.target.closest("[data-accion]");
      if (!b) return;
      if (b.dataset.accion === "filtro-estado") { filtroEstado = b.dataset.id; render(); }
      if (b.dataset.accion === "obs") { abierta = abierta === b.dataset.k ? null : b.dataset.k; render(); var ta = $(".form-obs textarea"); if (ta) ta.focus(); }
      if (b.dataset.accion === "cerrar-obs") { abierta = null; render(); }
    });
    $$(".form-conteo", v).forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        enviarUnaVez(form, function () {
          var p = form.dataset.k.split("|"), val = form.conteo.value;
          if (val === "") { var er = new Error("Escribe el conteo físico (0 si no hay unidades)."); er.campo = "conteo"; throw er; }
          var f = RC.guardarConteo(p[0], p[1], filtro.periodo, Number(val));
          var msg = "Conteo guardado: " + f.conteo + " u. de " + producto(f.productoId).nombre + ". ";
          msg += f.diferencia === 0 ? "Conciliado." : (f.diferencia < 0 ? "Faltan " + (-f.diferencia) + " u. por revisar." : "Sobran " + f.diferencia + " u. por revisar.");
          if (f.estado === "diferencia") abierta = form.dataset.k;
          toast(msg, f.diferencia === 0 ? "ok" : "error");
          render();
        });
      });
    });
    var fo = $(".form-obs", v);
    if (fo) {
      var modo = "guardar";
      $$('[type="submit"]', fo).forEach(function (b) { b.addEventListener("click", function () { modo = b.dataset.modo; }); });
      fo.addEventListener("submit", function (e) {
        e.preventDefault();
        enviarUnaVez(fo, function () {
          var p = fo.dataset.k.split("|");
          var marcar = modo === "revisar" ? true : (modo === "reabrir" ? false : undefined);
          var f = RC.guardarObservacion(p[0], p[1], filtro.periodo, fo.observacion.value, marcar);
          abierta = null;
          toast(modo === "revisar" ? "Diferencia marcada como revisada." : modo === "reabrir" ? "La diferencia vuelve a estar por revisar." : "Observación guardada.");
          render();
          return f;
        });
      });
    }
  };

  // ================= LIQUIDACIÓN =================
  VISTAS.liquidacion = function () {
    var per = filtro.periodo;
    if (!filtro.tienda) {
      var ts = RC.get().tiendas.filter(function (t) { return t.activa || RC.cerrado(t.id, per); });
      return encabezado("Liquidación", "Selecciona una tienda para ver el detalle de cobro de " + esc(periodo(per).nombre) + ".") +
        '<section class="tarjeta"><div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Tienda</th><th class="num">Unidades vendidas</th><th class="num">Total a cobrar</th><th>Estado</th><th></th></tr></thead><tbody>' +
        ts.map(function (t) {
          var l = RC.liquidacion(t.id, per);
          var u = l.lineas.reduce(function (a, x) { return a + x.cantidad; }, 0);
          return "<tr><td><strong>" + esc(t.nombre) + "</strong></td><td class='num'>" + num(u) + "</td><td class='num'>" + usd(l.total) + "</td><td>" + insigniaLiq(l.estado) + '</td><td class="acciones"><button class="btn btn-mini" data-accion="abrir" data-id="' + t.id + '">Ver detalle ' + ico("i-flecha") + "</button></td></tr>";
        }).join("") + "</tbody></table></div></section>";
    }
    var l = RC.liquidacion(filtro.tienda, per);
    var t = tienda(filtro.tienda);
    var unidades = l.lineas.reduce(function (a, x) { return a + x.cantidad; }, 0);
    var cab = '<div class="liq-cab"><div><span class="sub">Tienda</span><strong>' + esc(l.tienda) + '</strong><small class="sub">' + esc(t.direccion || "") + '</small></div><div><span class="sub">Período</span><strong>' + esc(l.periodoNombre) +
      '</strong></div><div><span class="sub">Estado</span>' + insigniaLiq(l.estado) + (l.fechaCierre ? '<small class="sub">Cerrada el ' + fecha(l.fechaCierre) + "</small>" : "") + "</div></div>";
    var detalle = l.lineas.length ? '<div class="tabla-envoltura"><table class="tabla tabla-liq"><thead><tr><th>Producto</th><th class="num">Unidades vendidas</th><th class="num">Precio unitario</th><th class="num">Subtotal</th></tr></thead><tbody>' +
      l.lineas.map(function (x) { return "<tr><td>" + esc(x.producto) + "</td><td class='num'>" + num(x.cantidad) + "</td><td class='num'>" + usd(x.precio) + "</td><td class='num'>" + usd(x.subtotal) + "</td></tr>"; }).join("") +
      "</tbody><tfoot><tr><td>Subtotal de ventas reportadas</td><td class='num'>" + num(unidades) + "</td><td></td><td class='num'>" + usd(l.subtotal) + "</td></tr>" +
      "<tr><td colspan='3'>Ajuste pactado: " + esc(l.ajusteNombre || "Sin ajuste") + (l.ajustePct ? " (" + l.ajustePct + " %)" : "") + "</td><td class='num'>" + usd(l.ajuste) + "</td></tr>" +
      "<tr class='total'><td colspan='3'>Total a cobrar a la tienda (USD)</td><td class='num' id='liq-total'>" + usd(l.total) + "</td></tr></tfoot></table></div>" :
      vacio("i-ventas", "No hay ventas reportadas", "Esta tienda no tiene ventas registradas en " + esc(l.periodoNombre) + ".", puede("movimientos") ? '<a class="btn btn-primario" href="#/ventas">' + ico("i-mas") + "Registrar venta</a>" : "");

    var difs = '<section class="tarjeta"><h2 class="tarjeta-titulo">Diferencias identificadas (no incluidas en el cobro)</h2>' + (l.diferencias.length ?
      '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Producto</th><th class="num">Saldo esperado</th><th class="num">Conteo físico</th><th>Tipo</th><th class="num">Unidades</th><th class="num">Valor referencial</th><th>Revisión</th></tr></thead><tbody>' +
      l.diferencias.map(function (x) {
        return "<tr><td>" + esc(x.producto) + "</td><td class='num'>" + num(x.esperado) + "</td><td class='num'>" + num(x.conteo) + "</td><td>" + x.tipo + "</td><td class='num'><b>" + num(x.unidades) + "</b></td><td class='num'>" + usd(x.valorReferencial) +
          "</td><td>" + (x.revisada ? '<span class="estado estado-revisada">Revisada</span>' : '<span class="estado estado-alerta">Por revisar</span>') + (x.observacion ? '<small class="sub">' + esc(x.observacion) + "</small>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div><p class='ayuda'>Los faltantes no se cobran automáticamente: se revisan con la tienda antes de decidir si son pérdida, error de registro o venta no reportada.</p>" :
      '<p class="ayuda">' + (l.pendientes.length ? "Todavía no hay conteos que comparar." : "Sin diferencias: el conteo físico coincide con el saldo esperado.") + "</p>") +
      (l.pendientes.length ? '<div class="nota nota-alerta">' + ico("i-alerta") + "Pendiente de conteo: " + l.pendientes.map(function (p) { return esc(p.producto) + " (se esperan " + p.esperado + " u.)"; }).join(", ") +
        '. <a href="#/conciliacion">Registrar conteo</a></div>' : "") + "</section>";

    var motivo = l.estado === "Preliminar" ? "Hay conteos pendientes o diferencias sin revisar: la liquidación es preliminar." : (l.estado === "Cerrada" ? "Liquidación cerrada: importes y precios quedan fijos aunque cambie el catálogo." : "Todo está conciliado o revisado. Ya se puede cerrar.");
    var acciones = '<div class="liq-acciones">' +
      '<button class="btn btn-secundario" data-accion="csv"' + (l.lineas.length ? "" : " disabled") + ">" + ico("i-descargar") + "Exportar CSV</button>" +
      '<button class="btn btn-secundario" data-accion="imprimir"' + (l.lineas.length ? "" : " disabled") + ">" + ico("i-imprimir") + "Imprimir / PDF</button>" +
      (puede("cerrar") && l.estado !== "Cerrada" ? '<button class="btn btn-primario" data-accion="cerrar-liq"' + (l.estado === "Lista para cerrar" && l.lineas.length ? "" : ' disabled title="' + esc(motivo) + '"') + ">" + ico("i-candado") + "Cerrar liquidación</button>" : "") +
      "</div>";

    return encabezado("Liquidación", "Detalle de cobro por ventas reportadas. Las diferencias de conciliación se muestran por separado.",
      '<button class="btn btn-secundario" data-accion="todas">Ver todas las tiendas</button>') +
      '<section class="tarjeta">' + cab + '<div class="nota ' + (l.estado === "Preliminar" ? "nota-alerta" : "nota-info") + '">' + ico(l.estado === "Preliminar" ? "i-alerta" : "i-ok") + motivo + "</div>" + detalle + acciones + "</section>" + difs;
  };
  ENLACES.liquidacion = function (v) {
    v.addEventListener("click", function (e) {
      var b = e.target.closest("[data-accion]");
      if (!b) return;
      var a = b.dataset.accion;
      if (a === "abrir") cambiarFiltro({ tienda: b.dataset.id });
      if (a === "todas") cambiarFiltro({ tienda: "" });
      if (a === "csv") exportarCSV(RC.liquidacion(filtro.tienda, filtro.periodo));
      if (a === "imprimir") imprimir(RC.liquidacion(filtro.tienda, filtro.periodo));
      if (a === "cerrar-liq") {
        var l = RC.liquidacion(filtro.tienda, filtro.periodo);
        confirmar("Cerrar liquidación", "Se cerrará la liquidación de " + l.tienda + " (" + l.periodoNombre + ") por " + usd(l.total) + ". Después no podrás modificar sus entregas, ventas, devoluciones ni conteos.", "Cerrar liquidación").then(function (ok) {
          if (!ok) return;
          try { RC.cerrarLiquidacion(filtro.tienda, filtro.periodo); toast("Liquidación cerrada por " + usd(l.total) + "."); render(); } catch (err) { toast(err.message, "error"); }
        });
      }
    });
  };

  // ---------------- Exportación CSV (separador ; y punto decimal) ----------------
  function csvLiquidacion(l) {
    function c(v) { var s = String(v === null || v === undefined ? "" : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    function n2(v) { return Number(v).toFixed(2); }
    var filas = [];
    filas.push(["ReCuenta - Liquidación de consignación"]);
    filas.push(["Tienda", l.tienda]);
    filas.push(["Período", l.periodoNombre]);
    filas.push(["Estado", l.estado]);
    filas.push([]);
    filas.push(["Producto", "Unidades vendidas", "Precio unitario (USD)", "Subtotal (USD)"]);
    l.lineas.forEach(function (x) { filas.push([x.producto, x.cantidad, n2(x.precio), n2(x.subtotal)]); });
    filas.push(["Subtotal de ventas reportadas", "", "", n2(l.subtotal)]);
    filas.push(["Ajuste pactado: " + (l.ajusteNombre || "Sin ajuste") + (l.ajustePct ? " (" + l.ajustePct + " %)" : ""), "", "", n2(l.ajuste)]);
    filas.push(["Total a cobrar (USD)", "", "", n2(l.total)]);
    filas.push([]);
    filas.push(["Diferencias identificadas (no incluidas en el cobro)"]);
    filas.push(["Producto", "Saldo esperado", "Conteo físico", "Tipo", "Unidades", "Valor referencial (USD)", "Revisión", "Observación"]);
    if (!l.diferencias.length) filas.push(["Sin diferencias registradas"]);
    l.diferencias.forEach(function (x) { filas.push([x.producto, x.esperado, x.conteo, x.tipo, x.unidades, n2(x.valorReferencial), x.revisada ? "Revisada" : "Por revisar", x.observacion]); });
    l.pendientes.forEach(function (p) { filas.push([p.producto, p.esperado, "", "Pendiente de conteo", "", "", "", ""]); });
    return "﻿" + filas.map(function (f) { return f.map(c).join(";"); }).join("\r\n");
  }
  function exportarCSV(l) {
    var texto = csvLiquidacion(l);
    var nombre = "liquidacion_" + l.tienda.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-") + "_" + l.periodo + ".csv";
    var blob = new Blob([texto], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast("CSV exportado: " + nombre);
  }

  // ---------------- Versión imprimible ----------------
  function imprimir(l) {
    var t = tienda(l.tiendaId);
    var unidades = l.lineas.reduce(function (a, x) { return a + x.cantidad; }, 0);
    $("#area-impresion").innerHTML =
      '<div class="imp-cab"><img src="assets/recuenta-logo.svg" alt="ReCuenta" width="250"><div><h1>Liquidación de consignación</h1><p>' + (l.estado === "Cerrada" ? "Cerrada el " + fecha(l.fechaCierre) : "Documento " + l.estado.toLowerCase()) + "</p></div></div>" +
      '<table class="imp-datos"><tr><th>Tienda</th><td>' + esc(l.tienda) + "</td><th>Período</th><td>" + esc(l.periodoNombre) + "</td></tr><tr><th>Dirección</th><td>" + esc(t.direccion || "—") + "</td><th>Contacto</th><td>" + esc(t.contacto || "—") + "</td></tr></table>" +
      '<table class="imp-tabla"><thead><tr><th>Producto</th><th>Unidades vendidas</th><th>Precio unitario</th><th>Subtotal</th></tr></thead><tbody>' +
      l.lineas.map(function (x) { return "<tr><td>" + esc(x.producto) + "</td><td>" + x.cantidad + "</td><td>" + usd(x.precio) + "</td><td>" + usd(x.subtotal) + "</td></tr>"; }).join("") +
      "</tbody><tfoot><tr><td>Subtotal</td><td>" + unidades + "</td><td></td><td>" + usd(l.subtotal) + "</td></tr><tr><td colspan='3'>Ajuste pactado: " + esc(l.ajusteNombre || "Sin ajuste") + (l.ajustePct ? " (" + l.ajustePct + " %)" : "") + "</td><td>" + usd(l.ajuste) +
      "</td></tr><tr class='total'><td colspan='3'>Total a cobrar (USD)</td><td>" + usd(l.total) + "</td></tr></tfoot></table>" +
      "<h2>Diferencias identificadas (no incluidas en el cobro)</h2>" + (l.diferencias.length || l.pendientes.length ? '<table class="imp-tabla"><thead><tr><th>Producto</th><th>Esperado</th><th>Conteo</th><th>Tipo</th><th>Unidades</th><th>Revisión</th></tr></thead><tbody>' +
        l.diferencias.map(function (x) { return "<tr><td>" + esc(x.producto) + "</td><td>" + x.esperado + "</td><td>" + x.conteo + "</td><td>" + x.tipo + "</td><td>" + x.unidades + "</td><td>" + (x.revisada ? "Revisada" : "Por revisar") + (x.observacion ? " · " + esc(x.observacion) : "") + "</td></tr>"; }).join("") +
        l.pendientes.map(function (p) { return "<tr><td>" + esc(p.producto) + "</td><td>" + p.esperado + "</td><td>—</td><td>Pendiente de conteo</td><td>—</td><td>—</td></tr>"; }).join("") + "</tbody></table>" : "<p>Sin diferencias.</p>") +
      '<div class="imp-firmas"><div>Entregado por (distribuidora)</div><div>Recibido por (tienda)</div></div><p class="imp-pie">Documento generado con ReCuenta · prototipo académico con datos ficticios.</p>';
    document.body.classList.add("imprimiendo");
    setTimeout(function () { window.print(); }, 50);
  }
  window.addEventListener("afterprint", function () { document.body.classList.remove("imprimiendo"); });

  // ---------------- Arranque ----------------
  function arrancar() {
    var s = RC.sesion();
    usuario = s && USUARIOS[s.perfil] ? USUARIOS[s.perfil] : null;
    $("#aviso-almacenamiento").hidden = RC.persistenciaOk();
    if (!usuario) {
      $("#app").hidden = true;
      $("#pantalla-acceso").hidden = false;
      document.title = "ReCuenta · Acceso";
      return;
    }
    $("#pantalla-acceso").hidden = true;
    $("#app").hidden = false;
    filtro = RC.filtro();
    render();
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-accion]");
    if (!b) return;
    var a = b.dataset.accion;
    if (a === "entrar") entrar(b.dataset.perfil);
    if (a === "salir") confirmar("Cerrar sesión", "¿Quieres salir de ReCuenta? Tus registros quedan guardados en este navegador.", "Cerrar sesión").then(function (ok) { if (ok) salir(); });
    if (a === "menu") document.body.classList.toggle("menu-abierto");
    if (a === "restaurar") confirmar("Restaurar datos de ejemplo", "Se borrarán todos los cambios hechos en este navegador y se cargará de nuevo el caso de Milagro (entrega 100, ventas 70, devoluciones 25, conteo pendiente). ¿Continuar?", "Restaurar").then(function (ok) {
      if (!ok) return;
      RC.restaurarDemo();
      Object.keys(edicion).forEach(function (k) { edicion[k] = null; });
      abierta = null; filtroEstado = "";
      filtro = { tienda: "T1", periodo: "2026-11" };
      RC.guardarFiltro(filtro);
      toast("Datos de ejemplo restaurados.");
      irA("inicio");
    });
  });
  $("#form-login").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(e.target), correo = String(f.get("correo") || "").trim().toLowerCase(), clave = String(f.get("clave") || "");
    var u = Object.keys(USUARIOS).map(function (k) { return USUARIOS[k]; }).filter(function (x) { return x.correo === correo; })[0];
    if (!u || u.clave !== clave) { $("#login-error").textContent = "Correo o contraseña incorrectos. Usa una de las cuentas de la tabla."; return; }
    $("#login-error").textContent = "";
    entrar(u.perfil);
  });
  $("#f-tienda").addEventListener("change", function (e) { cambiarFiltro({ tienda: e.target.value }); });
  $("#f-periodo").addEventListener("change", function (e) { cambiarFiltro({ periodo: e.target.value }); });
  window.addEventListener("hashchange", function () { if (usuario) { abierta = null; render(); $("#vista").focus({ preventScroll: true }); window.scrollTo(0, 0); } });

  // Primera visita: deja el caso de Doña Rosa como tienda activa para la demostración.
  if (RC.primeraVisita()) RC.guardarFiltro({ tienda: "T1", periodo: "2026-11" });
  arrancar();

  window.RC_APP = { csvLiquidacion: csvLiquidacion }; // usado por las pruebas
})();

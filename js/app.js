/*
 * ReCuenta - Interfaz (vistas, navegación por perfil y acciones).
 * Navegación por hash (#/inicio, #/entregas...) para que funcione en GitHub Pages y abriendo el archivo directamente.
 */
(function () {
  "use strict";

  // Módulos y perfiles que pueden abrirlos. Las acciones dentro de cada módulo las decide RC.puede (store.js).
  var MODULOS = [
    { id: "inicio", nombre: "Inicio", icono: "i-inicio", perfiles: ["admin", "repartidor", "contador", "tienda"] },
    { id: "catalogo", nombre: "Tiendas y productos", icono: "i-catalogo", perfiles: ["admin", "contador"] },
    { id: "entregas", nombre: "Entregas", icono: "i-entregas", perfiles: ["admin", "repartidor", "tienda"] },
    { id: "ventas", nombre: "Ventas", icono: "i-ventas", perfiles: ["admin", "repartidor", "tienda"] },
    { id: "devoluciones", nombre: "Devoluciones", icono: "i-devoluciones", perfiles: ["admin", "repartidor", "tienda"] },
    { id: "conciliacion", nombre: "Conciliación", icono: "i-conciliacion", perfiles: ["admin", "repartidor", "contador", "tienda"] },
    { id: "liquidacion", nombre: "Liquidación", icono: "i-liquidacion", perfiles: ["admin", "contador", "tienda"] },
    { id: "dinero", nombre: "¿Dónde está mi dinero?", icono: "i-dinero", perfiles: ["admin", "contador"] },
    { id: "impacto", nombre: "Impacto económico", icono: "i-impacto", perfiles: ["admin", "contador"] },
    { id: "usuarios", nombre: "Usuarios", icono: "i-usuarios", perfiles: ["admin"] },
    { id: "bitacora", nombre: "Bitácora", icono: "i-bitacora", perfiles: ["admin", "contador"] }
  ];

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
  var edicion = { entregas: null, ventas: null, devoluciones: null, tienda: null, producto: null, usuario: null };
  var filtroBitacora = { tipo: "", usuario: "" };
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
  function puede(accion) { return RC.puede(accion); }
  function rol(u) { return RC.PERFILES[(u || usuario).perfil]; }
  function esPerfil(p) { return usuario && usuario.perfil === p; }
  // ¿El registro de esta tienda entra en la vista actual? (filtro de la barra + tiendas permitidas del usuario)
  function enFiltro(tid) { return filtro.tienda ? tid === filtro.tienda : RC.puedeVerTienda(tid); }
  function tiendasVisibles() { return RC.get().tiendas.filter(function (t) { return RC.puedeVerTienda(t.id); }); }
  function filasVisibles(per) { return RC.filasConciliacion(filtro.tienda, per).filter(function (f) { return RC.puedeVerTienda(f.tiendaId); }); }
  function moduloPermitido(id) { var m = MODULOS.filter(function (x) { return x.id === id; })[0]; return !!(m && usuario && m.perfiles.indexOf(usuario.perfil) >= 0); }
  function fechaPorDefecto(per) {
    var hoy = new Date();
    var h = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");
    return h.slice(0, 7) === per ? h : per + "-01";
  }
  function rangoPeriodo(per) {
    var y = Number(per.slice(0, 4)), m = Number(per.slice(5, 7));
    var ult = new Date(y, m, 0).getDate();
    var max = per + "-" + String(ult).padStart(2, "0"), hoy = RCV.hoy();
    return { min: per + "-01", max: hoy < max ? hoy : max };
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
  // ---------------- Validación en línea ----------------
  // Cada campo muestra su mensaje debajo, en rojo, al salir del campo y al intentar guardar.
  var seqMsg = 0;
  var pulsandoBoton = false;
  document.addEventListener("pointerdown", function (e) { pulsandoBoton = !!(e.target.closest && e.target.closest("button")); }, true);
  document.addEventListener("pointerup", function () { setTimeout(function () { pulsandoBoton = false; }, 0); }, true);
  function claveCampo(el) { return el.closest(".linea") ? el.name : (el.dataset.campo || el.name || el.id || "campo"); }
  function nodosMsg(el) {
    var linea = el.closest(".linea");
    if (linea) {
      var lista = [], n = linea.nextElementSibling;
      while (n && n.classList.contains("msg-campo")) { lista.push(n); n = n.nextElementSibling; }
      return { lista: lista, poner: function (nodo) { (lista.length ? lista[lista.length - 1] : linea).after(nodo); } };
    }
    var cont = el.closest(".campo") || (el.tagName === "DIV" ? el : el.parentNode);
    return { lista: $$(":scope > .msg-campo", cont), poner: function (nodo) { cont.appendChild(nodo); } };
  }
  function marcarCampo(el, msg) {
    el.classList.toggle("invalido", !!msg);
    if (msg) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    var c = nodosMsg(el), k = claveCampo(el);
    var nodo = c.lista.filter(function (x) { return x.dataset.para === k; })[0];
    if (!msg) { if (nodo) nodo.remove(); el.removeAttribute("aria-describedby"); return; }
    if (!nodo) {
      nodo = document.createElement("small");
      nodo.className = "msg-campo"; nodo.dataset.para = k; nodo.id = "msg-" + (++seqMsg);
      c.poner(nodo);
    }
    nodo.textContent = msg;
    el.setAttribute("aria-describedby", nodo.id);
  }
  function enfocar(el) {
    var f = el.tagName === "DIV" ? $("input, select, textarea", el) : el;
    if (f && f.focus) { f.focus({ preventScroll: true }); (f.closest(".campo") || f).scrollIntoView({ block: "center", behavior: "smooth" }); }
  }
  // reglas(): devuelve [[elemento, fn(elemento) -> mensaje], ...]; se recalcula porque hay líneas dinámicas.
  function validador(form, reglas) {
    function lista() { return reglas().filter(function (r) { return r[0]; }); }
    function correr(r) { var m = r[1](r[0]) || ""; marcarCampo(r[0], m); return m; }
    function relacionadas(t) { return lista().filter(function (r) { return r[0] === t || (r[0].tagName === "DIV" && r[0].contains(t)); }); }
    // Si el foco sale del campo porque se está pulsando un botón del formulario, no se valida aquí:
    // el mensaje empujaría el botón antes de soltar el clic y el clic se perdería. Guardar valida todo.
    form.addEventListener("focusout", function (e) {
      var rel = e.relatedTarget;
      if (pulsandoBoton ||(rel && rel.tagName === "BUTTON" && form.contains(rel))) { relacionadas(e.target).forEach(function (r) { r[0].dataset.tocado = "1"; }); return; }
      relacionadas(e.target).forEach(function (r) { r[0].dataset.tocado = "1"; correr(r); });
    });
    function vivo(e) {
      // Un campo de texto dispara "change" al perder el foco: si es por pulsar un botón, Guardar valida todo.
      if (e.type === "change" && pulsandoBoton) return;
      // Revalida el campo editado (si ya se tocó) y los que estaban con error, para limpiar dependencias.
      lista().forEach(function (r) {
        var propio = r[0] === e.target || (r[0].tagName === "DIV" && r[0].contains(e.target));
        if ((propio && (r[0].dataset.tocado || e.type === "change")) || r[0].getAttribute("aria-invalid")) correr(r);
      });
    }
    form.addEventListener("input", vivo);
    form.addEventListener("change", vivo);
    form.validarTodo = function () {
      var primero = null;
      lista().forEach(function (r) { r[0].dataset.tocado = "1"; if (correr(r) && !primero) primero = r[0]; });
      var box = $(".error-form", form); if (box) box.textContent = "";
      if (primero) enfocar(primero);
      return !primero;
    };
  }
  function campoDe(form, nombre) {
    return form.querySelector('[data-campo="' + nombre + '"]') || form.querySelector('[name="' + nombre + '"]:not([type="checkbox"])');
  }
  // Errores de store.js: si traen campo, se muestran debajo de ese campo; si no, arriba del botón.
  function mostrarError(form, e) {
    var box = $(".error-form", form);
    var campo = e.campo ? campoDe(form, e.campo) : null;
    if (campo) { if (box) box.textContent = ""; marcarCampo(campo, e.message); enfocar(campo); }
    else { if (box) box.textContent = e.message; toast(e.message, "error"); }
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
  // Ingresar con un perfil: uno solo entra directo; varios abren el selector; ninguno muestra un aviso.
  function entrar(perfil) {
    var aviso = $("#acceso-aviso");
    aviso.textContent = "";
    var lista = RC.usuariosActivos(perfil);
    if (!lista.length) { aviso.textContent = "No hay usuarios activos con el perfil " + RC.PERFILES[perfil] + ". Pide al administrador que cree o active uno."; return; }
    if (lista.length === 1) { entrarComo(lista[0].id); return; }
    $("#selector-titulo").textContent = "Elige tu usuario · " + RC.PERFILES[perfil];
    $("#selector-texto").textContent = "Hay " + lista.length + " usuarios activos con este perfil.";
    $("#selector-lista").innerHTML = lista.map(function (u) {
      var extra = u.perfil === "tienda" ? tienda(u.tiendaId).nombre : (u.perfil === "repartidor" ? (u.tiendas || []).length + " tienda(s) en su ruta" : u.correo);
      return '<button class="selector-usuario" data-accion="entrar-como" data-id="' + u.id + '"><span class="avatar">' + ico("i-" + u.perfil) + "</span><span><strong>" + esc(u.nombre) + "</strong><small>" + esc(extra) + "</small></span></button>";
    }).join("");
    $("#selector-usuario").hidden = false;
    var b = $(".selector-usuario"); if (b) b.focus();
  }
  function entrarComo(id) {
    try { usuario = RC.iniciarSesion(id); } catch (e) { $("#acceso-aviso").textContent = e.message; return; }
    $("#selector-usuario").hidden = true;
    Object.keys(edicion).forEach(function (k) { edicion[k] = null; });
    abierta = null; filtroEstado = "";
    if (location.hash === "#/inicio") arrancar(); else { location.hash = "#/inicio"; arrancar(); }
  }
  function salir() {
    RC.cerrarSesion();
    usuario = null;
    history.replaceState(null, "", location.pathname + location.search);
    arrancar();
  }
  function salirSinConfirmar(msg) { salir(); if (msg) $("#acceso-aviso").textContent = msg; }

  // ---------------- Contexto (tienda y período activos) ----------------
  function pintarContexto() {
    var st = $("#f-tienda"), sp = $("#f-periodo");
    var fija = esPerfil("tienda");
    st.innerHTML = (fija ? "" : '<option value="">' + (esPerfil("repartidor") ? "Todas mis tiendas" : "Todas las tiendas") + "</option>") + tiendasVisibles().map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === filtro.tienda ? " selected" : "") + ">" + esc(t.nombre) + (t.activa ? "" : " (inactiva)") + "</option>";
    }).join("");
    st.disabled = fija;
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
  // Un módulo sin permiso no se abre aunque se escriba en la dirección: se avisa y se vuelve a Inicio.
  function moduloActual() {
    var id = (location.hash || "").replace(/^#\/?/, "").split("?")[0] || "inicio";
    var m = MODULOS.filter(function (x) { return x.id === id; })[0];
    if (!m) { if (location.hash && location.hash !== "#/inicio") history.replaceState(null, "", "#/inicio"); return MODULOS[0]; }
    if (m.perfiles.indexOf(usuario.perfil) < 0) {
      toast("Tu perfil (" + rol() + ") no tiene acceso a «" + m.nombre + "».", "error");
      history.replaceState(null, "", "#/inicio");
      return MODULOS[0];
    }
    return m;
  }
  function pintarNav(actual) {
    $("#nav").innerHTML = MODULOS.filter(function (m) { return m.perfiles.indexOf(usuario.perfil) >= 0; }).map(function (m) {
      return '<a class="btn-nav' + (m.id === actual.id ? " activo" : "") + '" href="#/' + m.id + '"' + (m.id === actual.id ? ' aria-current="page"' : "") + ">" + ico(m.icono) + "<span>" + m.nombre + "</span></a>";
    }).join("");
    var extra = esPerfil("tienda") ? " · " + tienda(usuario.tiendaId).nombre : "";
    $("#usuario").innerHTML = '<div class="avatar">' + ico("i-" + usuario.perfil) + "</div><div><strong>" + esc(usuario.nombre) + "</strong><small>" + esc(rol() + extra) + "</small></div>";
  }
  function irA(mod, cambios) {
    if (cambios) { filtro = Object.assign({}, filtro, cambios); RC.guardarFiltro(filtro); }
    if (location.hash === "#/" + mod) render(); else location.hash = "#/" + mod;
  }

  function render() {
    if (!usuario) return;
    // Si el usuario fue desactivado o borrado (por ejemplo, al restaurar los datos), se cierra la sesión.
    var vigente = RC.actor();
    if (!vigente) { salirSinConfirmar("Tu usuario ya no está activo. Vuelve a ingresar."); return; }
    usuario = vigente;
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
    return '<option value="">Selecciona…</option>' + tiendasVisibles().filter(function (t) { return !soloActivas || t.activa || t.id === sel; }).map(function (t) {
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
    if (esPerfil("tienda")) return inicioTienda();
    var per = filtro.periodo;
    var tiendas = tiendasVisibles().filter(function (t) { return t.activa && (!filtro.tienda || t.id === filtro.tienda); });
    var filas = filasVisibles(per);
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

    var esRep = esPerfil("repartidor");
    var tarjetas =
      '<div class="kpis">' +
      kpi(esRep ? "Tiendas de tu ruta" : "Tiendas activas", tiendas.length, filtro.tienda ? "Filtrada por la tienda activa" : (esRep ? "Asignadas a tu usuario" : "Con consignación en el período"), "catalogo", "i-catalogo") +
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

    return encabezado("Hola, " + esc(usuario.nombre.split(" ")[0]), "Resumen de " + esc(periodo(per).nombre) + (filtro.tienda ? " · " + esc(tienda(filtro.tienda).nombre) : (esRep ? " · tiendas de tu ruta" : " · todas las tiendas")) + ".") +
      bandejaExcepciones() + tarjetas + tarjetaDinero() + flujo + '<section class="tarjeta"><h2 class="tarjeta-titulo">Estado por tienda</h2>' + tabla + "</section>";
  };
  // Bandeja del administrador: entregas sin GPS o fuera de rango que esperan aprobación u observación.
  function bandejaExcepciones() {
    if (!puede("excepciones")) return "";
    var lista = RC.excepcionesPendientes();
    if (!lista.length) return "";
    return '<section class="tarjeta tarjeta-alerta" id="bandeja-excepciones"><h2 class="tarjeta-titulo">' + ico("i-alerta") + " Excepciones por revisar (" + lista.length + ")</h2>" +
      lista.map(function (e) {
        return '<form class="excepcion form-excepcion" data-id="' + e.id + '" novalidate><div class="excepcion-cab"><span><strong>' + esc(tienda(e.tiendaId).nombre) + "</strong> · " + fecha(e.fecha) + " · " +
          (e.gps ? "a " + distanciaTxt(e.gps.distancia) + " de la tienda" : "sin señal GPS") + " · " + esc(e.registradoPor ? e.registradoPor.nombre : "") + "</span>" +
          '<button type="button" class="btn btn-mini" data-accion="comprobante" data-id="' + e.id + '">Comprobante</button></div>' +
          '<p class="excepcion-just">«' + esc(e.justificacion) + "»</p>" +
          '<label class="campo"><span>Nota de revisión (obligatoria para observar)</span><textarea name="nota" rows="1" maxlength="200" placeholder="Ej.: Confirmado por llamada con la tienda."></textarea></label>' +
          '<div class="form-acciones"><button class="btn btn-secundario" type="submit" data-modo="observar">Observar</button><button class="btn btn-primario" type="submit" data-modo="aprobar">' + ico("i-ok") + "Aprobar</button></div></form>";
      }).join("") + "</section>";
  }
  function kpi(t, v, s, destino, icono, cls, estado) {
    var permitido = moduloPermitido(destino);
    return '<button class="kpi ' + (cls || "") + '" ' + (permitido ? 'data-accion="ir" data-destino="' + destino + '" data-estado="' + (estado || "") + '"' : "disabled") + '>' +
      '<span class="kpi-ico">' + ico(icono) + '</span><span class="kpi-txt"><span class="kpi-titulo">' + t + '</span><span class="kpi-valor">' + v + '</span><span class="kpi-sub">' + s + "</span></span></button>";
  }
  function paso(n, t, v, destino) {
    var permitido = moduloPermitido(destino);
    return '<button class="paso" ' + (permitido ? 'data-accion="ir" data-destino="' + destino + '"' : "disabled") + '><span class="paso-n">' + n + "</span><span><b>" + t + "</b><small>" + v + "</small></span></button>";
  }

  // Inicio del perfil Tienda: la misma cuenta que ve la distribuidora, solo de su tienda.
  function inicioTienda() {
    var d = RC.get(), per = filtro.periodo, tid = usuario.tiendaId, t = tienda(tid);
    var filas = RC.filasConciliacion(tid, per);
    var liq = RC.liquidacion(tid, per);
    var tot = { e: 0, v: 0, d: 0, saldo: 0 };
    filas.forEach(function (f) { tot.e += f.entregas; tot.v += f.ventas; tot.d += f.devoluciones; tot.saldo += Math.max(f.esperado, 0); });
    var difs = filas.filter(function (f) { return f.estado === "diferencia"; }).length;
    var entregas = d.entregas.filter(function (e) { return e.tiendaId === tid && e.periodo === per; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    var tarjetas = '<div class="kpis">' +
      kpi("Mercadería en tu tienda", num(tot.saldo) + " u.", "Saldo esperado en consignación", "conciliacion", "i-entregas") +
      kpi("Ventas reportadas", num(tot.v) + " u.", "Base de lo que pagas", "ventas", "i-ventas") +
      kpi("Diferencias por revisar", difs, difs ? "Se revisan contigo antes de cobrar" : "Tu cuenta está al día", "conciliacion", "i-alerta", difs ? "kpi-alerta" : "") +
      kpi(liq.estado === "Cerrada" ? "Liquidación cerrada" : "Total a pagar", usd(liq.total), liq.estado === "Cerrada" ? "Cerrada el " + fecha(liq.fechaCierre) : "Liquidación " + liq.estado.toLowerCase(), "liquidacion", "i-liquidacion", "kpi-dinero") +
      "</div>";
    var flujo = '<section class="tarjeta"><h2 class="tarjeta-titulo">Tu cuenta de consignación · ' + esc(periodo(per).nombre) + '</h2><div class="flujo">' +
      paso("1", "Recibiste", num(tot.e) + " u.", "entregas") + paso("2", "Vendiste", num(tot.v) + " u.", "ventas") +
      paso("3", "Devolviste", num(tot.d) + " u.", "devoluciones") + paso("4", "Conciliación", difs + " por revisar", "conciliacion") +
      paso("5", "A pagar", usd(liq.total), "liquidacion") + "</div></section>";
    var lista = '<section class="tarjeta"><h2 class="tarjeta-titulo">Entregas recibidas</h2>' + (entregas.length ?
      '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fecha</th><th>Productos</th><th class="num">Unidades</th><th>Recepción</th><th></th></tr></thead><tbody>' +
      entregas.map(function (e) {
        return "<tr><td>" + fecha(e.fecha) + "</td><td>" + e.lineas.map(function (l) { return esc(producto(l.productoId).nombre) + " <b>× " + num(l.cantidad) + "</b>"; }).join("<br>") +
          "</td><td class='num'>" + num(e.lineas.reduce(function (a, l) { return a + l.cantidad; }, 0)) + "</td><td>" + insigniasRecepcion(e) +
          '</td><td class="acciones"><button class="btn btn-mini' + (e.confirmada ? "" : " btn-primario") + '" data-accion="comprobante" data-id="' + e.id + '">' + (e.confirmada ? "Comprobante" : "Revisar y confirmar") + "</button></td></tr>";
      }).join("") + "</tbody></table></div>" : vacio("i-entregas", "Sin entregas en este período", "Cuando la distribuidora te entregue mercadería, aparecerá aquí.")) + "</section>";
    return encabezado("Hola, " + esc(usuario.nombre.split(" ")[0]), esc(t.nombre) + " · " + esc(periodo(per).nombre) + ". La cuenta que los dos ven igual: estos son los mismos números que ve la distribuidora.") +
      tarjetas + flujo + lista;
  }
  function insigniaLiq(e) {
    var cls = e === "Cerrada" ? "estado-ok" : (e === "Preliminar" ? "estado-pendiente" : "estado-revisada");
    return '<span class="estado ' + cls + '">' + e + "</span>";
  }
  ENLACES.inicio = function (v) {
    $$(".form-excepcion", v).forEach(function (fx) {
      var modo = "aprobar";
      $$('[type="submit"]', fx).forEach(function (b) { b.addEventListener("click", function () { modo = b.dataset.modo; }); });
      validador(fx, function () { return [[fx.nota, function (el) { return modo === "observar" ? RCV.observacion(el.value) : RCV.texto(el.value, 5, 200, "la nota", true); }]]; });
      fx.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!fx.validarTodo()) return;
        enviarUnaVez(fx, function () {
          RC.revisarExcepcion(fx.dataset.id, modo, fx.nota.value);
          toast(modo === "observar" ? "Excepción observada. Queda en la bitácora." : "Excepción aprobada. Queda en la bitácora.");
          render();
        });
      });
    });
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
      campo("Persona de contacto *", '<input name="contacto" maxlength="60" autocomplete="off" value="' + esc(t ? t.contacto : "") + '" placeholder="Ej.: Rosa Mendoza">') +
      campo("Dirección *", '<input name="direccion" maxlength="90" value="' + esc(t ? t.direccion : "") + '" placeholder="Calle, sector, Milagro">', "ancho") +
      campo("Celular o teléfono *", '<input name="telefono" type="tel" inputmode="tel" maxlength="10" value="' + esc(t ? t.telefono : "") + '" placeholder="09XXXXXXXX o 04XXXXXXX">') +
      campo("Estado", '<select name="activa"><option value="1">Activa</option><option value="0"' + (t && !t.activa ? " selected" : "") + ">Inactiva</option></select>") +
      campo("Ajuste pactado (%) *", '<input name="ajustePct" type="number" inputmode="decimal" min="0" max="50" step="0.1" value="' + (t ? t.ajustePct : 0) + '">') +
      campo("Nombre del ajuste", '<input name="ajusteNombre" maxlength="40" value="' + esc(t && t.ajustePct ? t.ajusteNombre : "") + '" placeholder="Obligatorio si el ajuste es mayor que 0">') +
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
      campo("Código *", '<input name="codigo" maxlength="12" autocapitalize="characters" class="mayusculas" value="' + esc(p ? p.codigo : "") + '" placeholder="Ej.: CAF-250">') +
      campo("Unidad *", '<input name="unidad" maxlength="20" value="' + esc(p ? p.unidad : "") + '" placeholder="Ej.: funda">') +
      campo("Precio de consignación (USD) *", '<input name="precio" type="number" inputmode="decimal" min="0.01" max="999.99" step="0.01" required value="' + (p ? RC.precioEn(p, per).toFixed(2) : "") + '" placeholder="0,00">') +
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
    if (ft) validador(ft, function () {
      return [
        [ft.nombre, function (el) { return RCV.nombreCosa(el.value, "de la tienda", function (s) { return RC.get().tiendas.some(function (t) { return t.nombre.toLowerCase() === s.toLowerCase() && t.id !== edicion.tienda; }); }); }],
        [ft.contacto, function (el) { return RCV.nombrePersona(el.value, { etiqueta: "el nombre del contacto" }); }],
        [ft.direccion, function (el) { return RCV.direccion(el.value); }],
        [ft.telefono, function (el) { return RCV.telefono(el.value); }],
        [ft.ajustePct, function (el) { return RCV.ajustePct(el.value); }],
        [ft.ajusteNombre, function (el) { return RCV.ajusteNombre(el.value, ft.ajustePct.value); }]
      ];
    });
    if (ft) ft.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!ft.validarTodo()) return;
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
    if (fp) {
      validador(fp, function () {
        var otros = RC.get().productos.filter(function (p) { return p.id !== edicion.producto; });
        return [
          [fp.nombre, function (el) { return RCV.nombreCosa(el.value, "del producto", function (s) { return otros.some(function (p) { return p.nombre.toLowerCase() === s.toLowerCase(); }); }); }],
          [fp.codigo, function (el) { return RCV.codigo(el.value, function (s) { return otros.some(function (p) { return (p.codigo || "").toUpperCase() === s; }); }); }],
          [fp.unidad, function (el) { return RCV.unidad(el.value); }],
          [fp.precio, function (el) { return RCV.precio(el.value); }]
        ];
      });
      // El código se convierte a mayúsculas al escribir.
      fp.codigo.addEventListener("input", function () { var p = fp.codigo.selectionStart; fp.codigo.value = fp.codigo.value.toUpperCase(); fp.codigo.setSelectionRange(p, p); });
    }
    if (fp) fp.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!fp.validarTodo()) return;
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
    var lista = d.entregas.filter(function (e) { return e.periodo === per && enFiltro(e.tiendaId); })
      .sort(function (a, b) { return (a.fecha + (a.registradoEn || "")) < (b.fecha + (b.registradoEn || "")) ? 1 : -1; });

    // Recepción en la tienda (solo en entregas nuevas): GPS, quién recibe, firma y justificación si hace falta.
    var recepcion = ed ? '<p class="ayuda">La corrección mantiene la firma, la ubicación y la persona que recibió la entrega original.</p>' :
      '<fieldset class="recepcion"><legend>Recepción en la tienda</legend>' +
      '<div class="gps-fila"><button type="button" class="btn btn-secundario" data-accion="capturar-gps">' + ico("i-ubicacion") + 'Capturar mi ubicación</button>' +
      '<p class="gps-estado" id="gps-estado">Captura tu ubicación al llegar. Debe estar a ' + RC.RANGO_ENTREGA + ' m o menos de la tienda.</p></div>' +
      campo("Recibido por *", '<input name="recibidoPor" maxlength="60" autocomplete="off" placeholder="Nombre de quien recibe en la tienda">', "ancho") +
      '<div class="campo ancho"><span>Firma de quien recibe *</span><div class="firma-caja" data-campo="firma"><canvas class="firma-lienzo" aria-label="Recuadro para firmar con el dedo"></canvas>' +
      '<span class="firma-guia">Firme aquí con el dedo</span></div><button type="button" class="btn btn-mini firma-borrar" data-accion="borrar-firma">' + ico("i-borrar") + "Borrar firma</button></div>" +
      '<div class="campo ancho" id="grupo-just" hidden><span>Justificación de la excepción GPS *</span><textarea name="justificacion" rows="2" maxlength="200" placeholder="Ej.: No hay señal GPS dentro del local; entrega en el mostrador."></textarea>' +
      '<small class="ayuda">Sin ubicación o a más de ' + RC.RANGO_ENTREGA + ' m, la entrega queda como «Excepción GPS» para que el administrador la revise.</small></div></fieldset>';

    var form = puede("movimientos") ? '<form class="tarjeta form" id="form-entrega" novalidate><h2 class="tarjeta-titulo">' + (ed ? "Corregir entrega" : "Registrar entrega") + "</h2>" +
      '<div class="rejilla-2">' +
      campo("Fecha *", '<input name="fecha" type="date" required min="' + r.min + '" max="' + r.max + '" value="' + (ed ? ed.fecha : fechaPorDefecto(per)) + '">') +
      campo("Período", '<input value="' + esc(periodo(per).nombre) + '" disabled>') +
      campo("Tienda *", '<select name="tiendaId" required>' + opcionesTiendas(tSel, true) + "</select>", "ancho") +
      '</div><div id="sugerido"></div><div class="lineas" data-campo="lineas">' +
      lineas.map(function (l, i) { return lineaHtml(l, i); }).join("") + "</div>" +
      '<button type="button" class="btn btn-secundario btn-mini" data-accion="agregar-linea">' + ico("i-mas") + "Agregar producto</button>" +
      campo("Nota o número de guía (opcional)", '<input name="nota" maxlength="80" value="' + esc(ed ? ed.nota : "") + '" placeholder="Ej.: Guía 0015 - ruta centro">', "ancho") +
      recepcion +
      '<p class="error-form" role="alert"></p><div class="form-acciones">' +
      (ed ? '<button type="button" class="btn btn-secundario" data-accion="cancelar">Cancelar corrección</button>' : "") +
      '<button class="btn btn-primario" type="submit"' + (bloqueado ? " disabled" : "") + ">" + ico("i-ok") + (ed ? "Guardar corrección" : "Guardar entrega") + "</button></div></form>" : "";

    var tabla = '<div class="tarjeta"><h2 class="tarjeta-titulo">Historial de entregas · ' + esc(periodo(per).nombre) + "</h2>" + (lista.length ?
      '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fecha</th><th>Tienda</th><th>Productos</th><th class="num">Unidades</th><th>Recepción</th><th></th></tr></thead><tbody>' +
      lista.map(function (e) {
        var u = e.lineas.reduce(function (a, l) { return a + l.cantidad; }, 0);
        var cerr = RC.cerrado(e.tiendaId, e.periodo);
        return "<tr" + (edicion.entregas === e.id ? ' class="fila-editando"' : "") + "><td>" + fecha(e.fecha) + "</td><td>" + esc(tienda(e.tiendaId).nombre) + (e.nota ? "<small class='sub'>" + esc(e.nota) + "</small>" : "") + "</td><td>" +
          e.lineas.map(function (l) { return esc(producto(l.productoId).nombre) + " <b>× " + num(l.cantidad) + "</b>"; }).join("<br>") + "</td><td class='num'>" + num(u) + "</td><td>" + insigniasRecepcion(e) + "</td>" +
          '<td class="acciones"><button class="btn btn-mini" data-accion="comprobante" data-id="' + e.id + '">Comprobante</button>' +
          (cerr ? '<span class="estado estado-gris">' + ico("i-candado") + "Cerrada</span>" : puede("movimientos") ?
            '<button class="btn btn-mini" data-accion="editar" data-id="' + e.id + '">' + ico("i-editar") + 'Corregir</button><button class="btn btn-mini btn-peligro" data-accion="eliminar" data-id="' + e.id + '" aria-label="Eliminar entrega">' + ico("i-borrar") + "</button>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" :
      vacio("i-entregas", "Sin entregas en este período", filtro.tienda ? "Esta tienda no tiene entregas registradas en " + esc(periodo(per).nombre) + "." : "Registra la primera entrega del período.", "")) + "</div>";

    return encabezado("Entregas", esPerfil("tienda") ? "Mercadería que la distribuidora entregó en tu tienda. Abre el comprobante para confirmar la recepción." : "Mercadería que sale de la distribuidora hacia cada tienda en consignación.") + avisoCerrado() + '<div class="dos-columnas">' + form + tabla + "</div>";
  };
  function insigniasRecepcion(e) {
    var h = [];
    if (e.excepcion) {
      var ex = { pendiente: ["Excepción GPS · por revisar", "estado-alerta"], aprobada: ["Excepción GPS · aprobada", "estado-revisada"], observada: ["Excepción GPS · observada", "estado-pendiente"] }[e.excepcion.estado];
      h.push('<span class="estado ' + ex[1] + '">' + ex[0] + "</span>");
    } else if (e.gps) h.push('<span class="estado estado-ok">En rango · ' + num(e.gps.distancia) + " m</span>");
    if (e.confirmada) h.push('<span class="estado estado-ok">' + ico("i-ok") + "Confirmada por la tienda</span>");
    else if (e.recibidoPor) h.push('<span class="estado estado-gris">Sin confirmar</span>');
    return h.join(" ") || "—";
  }
  function lineaHtml(l, i) {
    return '<div class="linea" data-i="' + i + '"><select name="producto" data-campo="linea-' + i + '" aria-label="Producto">' + opcionesProductos(l.productoId) + "</select>" +
      '<button type="button" class="btn-icono" data-accion="quitar-linea" aria-label="Quitar producto">' + ico("i-cerrar") + "</button>" +
      '<label class="linea-campo"><span>Cantidad *</span><input name="cantidad" data-campo="cantidad-' + i + '" type="number" min="1" max="10000" step="1" inputmode="numeric" value="' + (l.cantidad || "") + '" placeholder="0"></label>' +
      '<label class="linea-campo"><span>Vence el lote (opcional)</span><input name="vencimiento" data-campo="vencimiento-' + i + '" type="date" value="' + esc(l.vencimiento || "") + '"></label></div>';
  }
  function reglaFecha(form) {
    return [form.fecha, function (el) { return RCV.fecha(el.value, filtro.periodo, periodo(filtro.periodo).nombre); }];
  }

  // ---------- Firma táctil (canvas con pointer events) ----------
  function prepararFirma(caja) {
    var lienzo = $("canvas", caja), ctx = lienzo.getContext("2d"), dibujando = false, ultimo = null;
    var firmado = false;
    function ajustar() {
      var r = lienzo.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      lienzo.width = Math.max(1, Math.round(r.width * dpr)); lienzo.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1F3D35";
      firmado = false; caja.classList.remove("firmada");
    }
    function punto(e) { var r = lienzo.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    lienzo.addEventListener("pointerdown", function (e) {
      e.preventDefault(); dibujando = true; ultimo = punto(e);
      try { lienzo.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ }
      ctx.beginPath(); ctx.arc(ultimo.x, ultimo.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = "#1F3D35"; ctx.fill();
    });
    lienzo.addEventListener("pointermove", function (e) {
      if (!dibujando) return;
      e.preventDefault();
      var p = punto(e);
      ctx.beginPath(); ctx.moveTo(ultimo.x, ultimo.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ultimo = p;
      if (!firmado) { firmado = true; caja.classList.add("firmada"); }
    });
    function fin() {
      if (!dibujando) return;
      dibujando = false;
      if (firmado) caja.dispatchEvent(new Event("input", { bubbles: true }));
    }
    lienzo.addEventListener("pointerup", fin);
    lienzo.addEventListener("pointercancel", fin);
    ajustar();
    return {
      firmado: function () { return firmado; },
      borrar: function () { ajustar(); caja.dispatchEvent(new Event("input", { bubbles: true })); },
      // Se guarda una copia reducida (máx. 480 px de ancho) para no llenar el almacenamiento del navegador.
      imagen: function () {
        if (!firmado) return "";
        var w = Math.min(480, lienzo.width), h = Math.round(lienzo.height * w / lienzo.width);
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(lienzo, 0, 0, w, h);
        return c.toDataURL("image/png");
      }
    };
  }

  // ---------- Ubicación del dispositivo ----------
  function obtenerUbicacion(ok, falla) {
    if (!navigator.geolocation) { falla("Este dispositivo no permite obtener la ubicación."); return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      ok({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy, simulada: false });
    }, function (err) {
      falla(err && err.code === 1 ? "No diste permiso para usar la ubicación." : "No se pudo obtener la ubicación (sin señal GPS).");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  function distanciaTxt(m) { return m === null || m === undefined ? "—" : (m >= 1000 ? num(Math.round(m / 100) / 10) + " km" : num(m) + " m"); }

  ENLACES.entregas = function (v) {
    var form = $("#form-entrega", v);
    vigilarCierre(form);
    var firma = null, ubic = null, gpsError = "";
    var nueva = !!(form && !edicion.entregas);
    function enRango() {
      if (!ubic || !form.tiendaId.value) return false;
      var dist = RC.distancia(ubic, tienda(form.tiendaId.value));
      return dist !== null && dist <= RC.RANGO_ENTREGA;
    }
    function pintarGps() {
      if (!nueva) return;
      var out = $("#gps-estado", v), t = form.tiendaId.value ? tienda(form.tiendaId.value) : null;
      if (ubic) {
        var dist = t ? RC.distancia(ubic, t) : null;
        out.className = "gps-estado " + (dist !== null && dist <= RC.RANGO_ENTREGA ? "gps-ok" : "gps-fuera");
        out.innerHTML = !t ? "Ubicación capturada (±" + Math.round(ubic.precision) + " m). Elige la tienda para medir la distancia." :
          dist === null ? "La tienda no tiene coordenadas registradas: la entrega quedará como Excepción GPS." :
          "Estás a <b>" + distanciaTxt(dist) + "</b> de " + esc(t.nombre) + " · " + (dist <= RC.RANGO_ENTREGA ? "<b>dentro del rango</b>" : "<b>fuera del rango</b> (máx. " + RC.RANGO_ENTREGA + " m)") +
          (ubic.simulada ? " · ubicación simulada" : "") +
          ' · <a href="https://www.google.com/maps?q=' + ubic.lat + "," + ubic.lng + '" target="_blank" rel="noopener">ver en el mapa</a>';
      } else if (gpsError) { out.className = "gps-estado gps-fuera"; out.textContent = gpsError + " Puedes registrar la entrega con justificación."; }
      $("#grupo-just", v).hidden = enRango() || (!ubic && !gpsError);
    }
    function pintarSugerido() { var c = $("#sugerido", v); if (c) c.innerHTML = form.tiendaId.value ? htmlSugerido(form.tiendaId.value) : ""; }
    if (nueva) {
      firma = prepararFirma($(".firma-caja", v));
      form.tiendaId.addEventListener("change", pintarGps);
      form.tiendaId.addEventListener("change", pintarSugerido);
      pintarSugerido();
    }
    if (form) validador(form, function () {
      var reglas = [reglaFecha(form), [form.tiendaId, function (el) { return RCV.seleccion(el.value, "la tienda"); }]];
      var filas = $$(".linea", form);
      filas.forEach(function (row, i) {
        var sel = $('[name="producto"]', row), cant = $('[name="cantidad"]', row), venc = $('[name="vencimiento"]', row);
        // Las claves de los campos siguen la posición actual de la línea.
        sel.dataset.campo = "linea-" + i; cant.dataset.campo = "cantidad-" + i; venc.dataset.campo = "vencimiento-" + i;
        reglas.push([sel, function (el) {
          if (!el.value) return "Selecciona el producto.";
          var repetido = filas.slice(0, i).some(function (r) { return $('[name="producto"]', r).value === el.value; });
          return repetido ? "El producto está repetido. Suma las cantidades en una sola línea." : "";
        }]);
        reglas.push([cant, function (el) { return RCV.cantidad(el.value); }]);
        reglas.push([venc, function (el) { return RCV.vencimiento(el.value, form.fecha.value); }]);
      });
      reglas.push([form.nota, function (el) { return RCV.nota(el.value); }]);
      if (nueva) {
        reglas.push([form.recibidoPor, function (el) { return RCV.nombrePersona(el.value, { etiqueta: "el nombre de quien recibe" }); }]);
        reglas.push([$(".firma-caja", form), function () { return firma.firmado() ? "" : "Pide a quien recibe que firme en el recuadro."; }]);
        if (!enRango()) reglas.push([form.justificacion, function (el) { $("#grupo-just", v).hidden = false; return RCV.justificacion(el.value); }]);
      }
      return reglas;
    });
    v.addEventListener("click", function (e) {
      var b = e.target.closest("[data-accion]");
      if (!b) return;
      var a = b.dataset.accion;
      if (a === "capturar-gps") {
        var out = $("#gps-estado", v);
        out.className = "gps-estado"; out.textContent = "Obteniendo tu ubicación…";
        b.disabled = true;
        obtenerUbicacion(function (p) { ubic = p; gpsError = ""; b.disabled = false; pintarGps(); },
          function (msg) { ubic = null; gpsError = msg; b.disabled = false; pintarGps(); });
      }
      if (a === "borrar-firma" && firma) firma.borrar();
      if (a === "usar-sugerencia") {
        var sug = RC.sugerido(form.tiendaId.value, filtro.periodo).filter(function (x) { return x.sugerido > 0; });
        var cont = $(".lineas", v);
        cont.innerHTML = sug.map(function (x, i) { return lineaHtml({ productoId: x.productoId, cantidad: x.sugerido }, i); }).join("");
        toast("Se cargaron " + sug.length + " producto(s) con la cantidad sugerida. Puedes ajustarlas.");
      }
      if (a === "agregar-linea") {
        var cont = $(".lineas", v);
        var div = document.createElement("div");
        div.innerHTML = lineaHtml({ productoId: "", cantidad: "" }, $$(".linea", v).length);
        cont.appendChild(div.firstChild);
      }
      if (a === "quitar-linea") {
        if ($$(".linea", v).length === 1) { toast("La entrega necesita al menos un producto.", "error"); return; }
        var fila = b.closest(".linea");
        // Quita también los mensajes de error de esa línea.
        while (fila.nextElementSibling && fila.nextElementSibling.classList.contains("msg-campo")) fila.nextElementSibling.remove();
        fila.remove();
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
      if (!form.validarTodo()) return;
      enviarUnaVez(form, function () {
        var f = new FormData(form);
        var lineas = $$(".linea", form).map(function (row) {
          var c = $('[name="cantidad"]', row).value;
          return { productoId: $('[name="producto"]', row).value, cantidad: c === "" ? NaN : Number(c), vencimiento: $('[name="vencimiento"]', row).value };
        });
        var editando = !!edicion.entregas;
        var datos = { id: edicion.entregas, fecha: f.get("fecha"), periodo: filtro.periodo, tiendaId: f.get("tiendaId"), lineas: lineas, nota: f.get("nota") };
        if (!editando) { datos.recibidoPor = f.get("recibidoPor"); datos.firma = firma.imagen(); datos.gps = ubic; datos.justificacion = f.get("justificacion"); }
        var r = RC.guardarEntrega(datos);
        edicion.entregas = null;
        var u = r.lineas.reduce(function (a, l) { return a + l.cantidad; }, 0);
        toast((editando ? "Entrega corregida: " : (r.excepcion ? "Entrega guardada como Excepción GPS: " : "Entrega guardada: ")) + u + " u. para " + tienda(r.tiendaId).nombre + ".", r.excepcion ? "error" : "ok");
        if (!filtro.tienda) cambiarFiltro({ tienda: r.tiendaId }); else render();
        if (!editando) abrirComprobante(r.id);
      });
    });
  };

  // ---------- Comprobante de entrega y WhatsApp ----------
  function fechaHora(iso) { if (!iso) return "—"; var p = iso.split("T"); return fecha(p[0]) + (p[1] ? " " + p[1].slice(0, 5) : ""); }
  // Celular 09XXXXXXXX -> 5939XXXXXXXX. Un teléfono fijo no tiene WhatsApp: se abre WhatsApp para elegir el contacto.
  function numeroWhatsApp(tel) { var t = String(tel || "").replace(/\D/g, ""); return /^09\d{8}$/.test(t) ? "593" + t.slice(1) : ""; }
  function enlaceWhatsApp(tel, texto) { return "https://wa.me/" + numeroWhatsApp(tel) + "?text=" + encodeURIComponent(texto); }
  function textoComprobante(e) {
    var t = tienda(e.tiendaId);
    var l = ["*ReCuenta · Comprobante de entrega " + e.id + "*", "Tienda: " + t.nombre, "Fecha: " + fechaHora(e.registradoEn || e.fecha), "Productos:"];
    e.lineas.forEach(function (x) { l.push("• " + producto(x.productoId).nombre + " × " + x.cantidad + (x.vencimiento ? " (vence " + fecha(x.vencimiento) + ")" : "")); });
    l.push("Total: " + e.lineas.reduce(function (a, x) { return a + x.cantidad; }, 0) + " u.");
    if (e.recibidoPor) l.push("Recibido por: " + e.recibidoPor);
    if (e.gps) l.push("Ubicación: https://www.google.com/maps?q=" + e.gps.lat + "," + e.gps.lng + " (a " + distanciaTxt(e.gps.distancia) + " de la tienda)");
    if (e.excepcion) l.push("Excepción GPS: " + e.justificacion);
    if (e.registradoPor) l.push("Entregado por: " + e.registradoPor.nombre);
    l.push("La cuenta que los dos ven igual.");
    return l.join("\n");
  }
  function abrirComprobante(id) {
    var e = RC.porId(RC.get().entregas, id);
    if (!e) return;
    var t = tienda(e.tiendaId);
    var tot = e.lineas.reduce(function (a, x) { return a + x.cantidad; }, 0);
    var html = '<h3 id="detalle-titulo">Comprobante de entrega ' + esc(e.id) + "</h3>" +
      '<dl class="comprobante"><dt>Tienda</dt><dd>' + esc(t.nombre) + "<small class='sub'>" + esc(t.direccion || "") + "</small></dd>" +
      "<dt>Fecha y hora</dt><dd>" + fechaHora(e.registradoEn || e.fecha) + "</dd>" +
      "<dt>Entregado por</dt><dd>" + esc(e.registradoPor ? e.registradoPor.nombre : "—") + "</dd>" +
      "<dt>Recibido por</dt><dd>" + esc(e.recibidoPor || "—") + "</dd>" +
      "<dt>Ubicación</dt><dd>" + (e.gps ? '<a href="https://www.google.com/maps?q=' + e.gps.lat + "," + e.gps.lng + '" target="_blank" rel="noopener">Ver en el mapa</a> · a ' + distanciaTxt(e.gps.distancia) + " de la tienda" + (e.gps.precision ? " (±" + e.gps.precision + " m)" : "") : "Sin GPS") + "</dd>" +
      "<dt>Estado</dt><dd>" + insigniasRecepcion(e) + (e.excepcion ? "<small class='sub'>Justificación: " + esc(e.justificacion) + "</small>" + (e.excepcion.nota ? "<small class='sub'>Revisión de " + esc(e.excepcion.revisadoPor) + ": " + esc(e.excepcion.nota) + "</small>" : "") : "") +
      (e.confirmada ? "<small class='sub'>Confirmada por " + esc(e.confirmada.por) + " el " + fechaHora(e.confirmada.en) + "</small>" : "") + "</dd></dl>" +
      '<table class="tabla tabla-mini"><thead><tr><th>Producto</th><th class="num">Cantidad</th><th>Vence</th></tr></thead><tbody>' +
      e.lineas.map(function (x) { return "<tr><td>" + esc(producto(x.productoId).nombre) + "</td><td class='num'>" + num(x.cantidad) + "</td><td>" + (x.vencimiento ? fecha(x.vencimiento) : "—") + "</td></tr>"; }).join("") +
      "</tbody><tfoot><tr><td>Total</td><td class='num'>" + num(tot) + "</td><td></td></tr></tfoot></table>" +
      '<div class="firma-ver"><span class="sub">Firma</span>' + (e.firma ? '<img src="' + e.firma + '" alt="Firma de ' + esc(e.recibidoPor || "quien recibe") + '">' : '<p class="ayuda">Registro de ejemplo sin firma digital.</p>') + "</div>" +
      '<div class="modal-acciones">' +
      (esPerfil("tienda") && !e.confirmada ? '<button class="btn btn-primario" data-accion="confirmar-recepcion" data-id="' + e.id + '">' + ico("i-ok") + "Confirmar recepción</button>" : "") +
      '<a class="btn btn-whatsapp" target="_blank" rel="noopener" href="' + esc(enlaceWhatsApp(t.telefono, textoComprobante(e))) + '">' + ico("i-whatsapp") + "Enviar por WhatsApp</a>" +
      '<button class="btn btn-secundario" data-accion="cerrar-detalle">Cerrar</button></div>';
    abrirDetalle(html);
  }
  function abrirDetalle(html) {
    $("#detalle-cuerpo").innerHTML = html;
    $("#detalle").hidden = false;
    var b = $("#detalle .modal-acciones .btn"); if (b) b.focus();
  }
  function cerrarDetalle() { $("#detalle").hidden = true; $("#detalle-cuerpo").innerHTML = ""; }

  // ================= VENTAS y DEVOLUCIONES =================
  function vistaMovimiento(tipo) {
    var d = RC.get(), per = filtro.periodo, esVenta = tipo === "ventas";
    var ed = edicion[tipo] ? RC.porId(d[tipo], edicion[tipo]) : null;
    var tSel = ed ? ed.tiendaId : filtro.tienda;
    var r = rangoPeriodo(per);
    var bloqueado = tSel && RC.cerrado(tSel, per);
    var lista = d[tipo].filter(function (x) { return x.periodo === per && enFiltro(x.tiendaId); })
      .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    var titulo = esVenta ? "Ventas reportadas" : "Devoluciones";
    var texto = esVenta ? "Unidades que cada tienda informa como vendidas. Son la base de la liquidación." : "Unidades que el repartidor retira de la tienda. Cada unidad se descuenta una sola vez del saldo y no se cobra a la tienda.";

    var form = puede("movimientos") ? '<form class="tarjeta form" id="form-mov" novalidate><h2 class="tarjeta-titulo">' + (ed ? "Corregir registro" : (esVenta ? "Registrar venta reportada" : "Registrar devolución")) + "</h2>" +
      '<div class="rejilla-2">' +
      campo("Fecha *", '<input name="fecha" type="date" required min="' + r.min + '" max="' + r.max + '" value="' + (ed ? ed.fecha : fechaPorDefecto(per)) + '">') +
      campo("Período", '<input value="' + esc(periodo(per).nombre) + '" disabled>') +
      campo("Tienda *", '<select name="tiendaId" required>' + opcionesTiendas(tSel, true) + "</select>", "ancho") +
      campo("Producto *", '<select name="productoId" required>' + opcionesProductos(ed ? ed.productoId : "") + "</select>", "ancho") +
      campo("Cantidad *", '<input name="cantidad" type="number" min="1" max="10000" step="1" inputmode="numeric" required value="' + (ed ? ed.cantidad : "") + '" placeholder="0">') +
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
        validador(form, function () {
          var reglas = [reglaFecha(form),
            [form.tiendaId, function (el) { return RCV.seleccion(el.value, "la tienda"); }],
            [form.productoId, function (el) { return RCV.seleccion(el.value, "el producto"); }],
            [form.cantidad, function (el) {
              var t = form.tiendaId.value, p = form.productoId.value, max = null;
              if (t && p) { var excl = {}; excl[tipo === "ventas" ? "venta" : "devolucion"] = edicion[tipo]; max = RC.disponible(t, p, filtro.periodo, excl); }
              return RCV.cantidad(el.value, max, max !== null ? "de " + producto(p).nombre + " en esta tienda" : "");
            }]];
          if (form.condicion) reglas.push([form.condicion, function (el) { return RCV.seleccion(el.value, "la condición de las unidades"); }]);
          return reglas;
        });
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          if (!form.validarTodo()) return;
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
    var filas = filasVisibles(per);
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
        var editaObs = puede("conteo") || puede("revisar");
        var obs = f.conteo === null ? '<span class="sub">' + (puede("conteo") ? "Registra el conteo" : "Conteo pendiente") + "</span>" :
          !editaObs ? (f.observacion ? '<small class="sub obs-txt">' + esc(f.observacion) + "</small>" : "") :
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
      validador(form, function () { return [[form.conteo, function (el) { return RCV.conteo(el.value); }]]; });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.validarTodo()) return;
        enviarUnaVez(form, function () {
          var p = form.dataset.k.split("|"), val = form.conteo.value;
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
      validador(fo, function () {
        return [[fo.observacion, function (el) { return modo === "reabrir" ? RCV.texto(el.value, 5, 200, "la observación", true) : RCV.observacion(el.value); }]];
      });
      fo.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!fo.validarTodo()) return;
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
      var ts = tiendasVisibles().filter(function (t) { return t.activa || RC.cerrado(t.id, per); });
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
      (l.lineas.length ? '<a class="btn btn-whatsapp" id="liq-whatsapp" target="_blank" rel="noopener" href="' + esc(enlaceWhatsApp(t.telefono, textoLiquidacion(l))) + '">' + ico("i-whatsapp") + "Enviar por WhatsApp</a>" : "") +
      (puede("cerrar") && l.estado !== "Cerrada" ? '<button class="btn btn-primario" data-accion="cerrar-liq"' + (l.estado === "Lista para cerrar" && l.lineas.length ? "" : ' disabled title="' + esc(motivo) + '"') + ">" + ico("i-candado") + "Cerrar liquidación</button>" : "") +
      "</div>";

    return encabezado("Liquidación", esPerfil("tienda") ? "Lo que pagas por tus ventas reportadas. Es el mismo detalle que ve la distribuidora." : "Detalle de cobro por ventas reportadas. Las diferencias de conciliación se muestran por separado.",
      esPerfil("tienda") ? "" : '<button class="btn btn-secundario" data-accion="todas">Ver todas las tiendas</button>') +
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

  // ================= ¿DÓNDE ESTÁ MI DINERO? (administrador y contador) =================
  function resumenDinero(per) {
    var ind = tiendasVisibles().filter(function (t) { return t.activa; }).map(function (t) { var i = RC.indicadoresTienda(t.id, per); i.tienda = t.nombre; return i; });
    var capital = RC.r2(ind.reduce(function (a, i) { return a + i.capital; }, 0));
    var alertas = RC.alertasVencimiento(per, RCV.hoy()).filter(function (a) { return RC.puedeVerTienda(a.tiendaId); });
    return { ind: ind, capital: capital, costo: RC.r2(capital * RC.TASA_ANUAL / 12), alertas: alertas };
  }
  function fraseDinero(r) {
    return "Tienes <b>" + usd(r.capital) + "</b> en mercadería en consignación. A la tasa del proyecto (10 % anual), te cuesta <b>" + usd(r.costo) + "</b> por mes.";
  }
  var COLORES = { verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" };
  VISTAS.dinero = function () {
    var per = filtro.periodo, r = resumenDinero(per);
    var rojos = r.ind.filter(function (i) { return i.color === "rojo"; }).length;
    var k = '<p class="frase-dinero">' + fraseDinero(r) + "</p>" + '<div class="kpis">' +
      kpiFijo("Capital inmovilizado", usd(r.capital), "Saldo esperado × precio del período", "i-dinero", "kpi-dinero") +
      kpiFijo("Costo de oportunidad", usd(r.costo) + "/mes", "Capital × 10 % ÷ 12", "i-impacto") +
      kpiFijo("Lotes por vencer", r.alertas.length, "En 15 días o menos", "i-alerta", r.alertas.length ? "kpi-alerta" : "") +
      kpiFijo("Tiendas en rojo", rojos, "Reducir o pasar a venta directa", "i-catalogo", rojos ? "kpi-alerta" : "") + "</div>";

    var alertas = '<section class="tarjeta"><h2 class="tarjeta-titulo">Alertas de vencimiento</h2>' + (r.alertas.length ? '<ul class="alertas">' + r.alertas.map(function (a) {
      return '<li class="alerta-venc"><div><strong>' + esc(a.producto) + "</strong> en " + esc(a.tienda) + '<small class="sub">' + num(a.unidades) + " u. (" + usd(a.valor) + ") · vence el " + fecha(a.vencimiento) + " · rotación " + num(a.rotacion) + " %</small></div>" +
        '<span class="estado ' + (a.dias <= 7 ? "estado-alerta" : "estado-pendiente") + '">' + (a.dias < 0 ? "Vencido hace " + (-a.dias) + " días" : a.dias === 0 ? "Vence hoy" : "En " + a.dias + " días") + "</span>" +
        '<p class="sugerencia">' + (a.trasladar ? "Rotación baja: sugerimos <b>trasladar a " + esc(a.trasladar.tienda) + "</b>, que rota este producto al " + num(a.trasladar.rotacion) + " %." :
          a.rotacionBaja ? "Rotación baja y ninguna otra tienda lo rota mejor: promociónalo o retíralo a tiempo." : "Rota bien: vigila que se venda antes del vencimiento.") + "</p></li>";
    }).join("") + "</ul>" : '<p class="ayuda">No hay lotes que venzan en los próximos 15 días.</p>') + "</section>";

    var semaforo = '<section class="tarjeta"><h2 class="tarjeta-titulo">Semáforo de tiendas · ' + esc(periodo(per).nombre) + '</h2><div class="semaforo">' + r.ind.map(function (i) {
      return '<article class="sem sem-' + i.color + '"><div class="sem-cab"><span class="sem-luz" aria-hidden="true"></span><div><strong>' + esc(i.tienda) + '</strong><small class="sub">' + COLORES[i.color] + " · " + i.recomendacion + '</small></div><b class="sem-puntaje">' + num(Math.round(i.puntaje)) + "</b></div>" +
        '<dl class="sem-datos"><dt>Rotación</dt><dd>' + num(i.rotacion) + " %</dd><dt>Exactitud</dt><dd>" + num(i.exactitud) + "</dd><dt>Merma</dt><dd>" + num(i.mermaPts) + "</dd><dt>Límite sugerido</dt><dd>" + usd(i.limite) + " <small>(" + String(i.factor).replace(".", ",") + " × ventas de " + usd(i.ventasUsd) + ")</small></dd></dl></article>";
    }).join("") + "</div>" +
      '<p class="formula">Puntaje = 50 % rotación + 30 % exactitud + 20 % merma. Rotación = ventas ÷ (inicial + entregas) × 100. Exactitud = 100 − (faltantes ÷ entregadas × 100 × 5). Merma = 100 − (dañadas o vencidas ÷ entregadas × 100 × 5). ' +
      "Verde ≥ 70: ampliar consignación (límite 1,5 × ventas). Amarillo 40–69: mantener y vigilar (1 ×). Rojo &lt; 40: reducir o pasar a venta directa (0,5 ×).</p></section>";

    var filas = [];
    r.ind.forEach(function (i) { i.detalle.forEach(function (d) { filas.push("<tr><td>" + esc(i.tienda) + "</td><td>" + esc(d.producto) + "</td><td class='num'>" + num(d.saldo) + "</td><td class='num'>" + usd(d.precio) + "</td><td class='num'>" + usd(d.capital) + "</td></tr>"); }); });
    var capital = '<section class="tarjeta"><h2 class="tarjeta-titulo">Capital inmovilizado por tienda y producto</h2>' + (filas.length ? '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Tienda</th><th>Producto</th><th class="num">Saldo esperado</th><th class="num">Precio</th><th class="num">Capital</th></tr></thead><tbody>' + filas.join("") +
      "</tbody><tfoot>" + r.ind.map(function (i) { return "<tr><td colspan='4'>" + esc(i.tienda) + " · costo de oportunidad " + usd(i.costoMensual) + "/mes</td><td class='num'>" + usd(i.capital) + "</td></tr>"; }).join("") +
      "<tr class='total'><td colspan='4'>Total en consignación</td><td class='num' id='capital-total'>" + usd(r.capital) + "</td></tr></tfoot></table></div>" : '<p class="ayuda">No hay mercadería en consignación en este período.</p>') + "</section>";

    return encabezado("¿Dónde está mi dinero?", "Cuánto capital tienes en las tiendas, cuánto te cuesta y qué hacer con cada tienda.") + k + alertas + semaforo + capital;
  };
  function tarjetaDinero() {
    if (!moduloPermitido("dinero")) return "";
    var r = resumenDinero(filtro.periodo);
    return '<section class="tarjeta tarjeta-dinero"><h2 class="tarjeta-titulo">¿Dónde está mi dinero?</h2><p class="frase-dinero">' + fraseDinero(r) + "</p>" +
      '<p class="ayuda">' + r.alertas.length + " lote(s) por vencer · " + r.ind.map(function (i) { return '<span class="punto punto-' + i.color + '"></span>' + esc(i.tienda); }).join(" · ") + "</p>" +
      '<a class="btn btn-secundario" href="#/dinero">Ver detalle ' + ico("i-flecha") + "</a></section>";
  }

  // Sugerido de reposición en Entregas.
  function htmlSugerido(t) {
    var s = RC.sugerido(t, filtro.periodo);
    if (!s.length) return '<p class="ayuda sugerido">Sin historial de ventas de esta tienda en el período: no hay sugerido de reposición.</p>';
    var hay = s.some(function (x) { return x.sugerido > 0; });
    return '<div class="sugerido"><div class="sugerido-cab"><strong>Sugerido de reposición</strong>' + (hay ? '<button type="button" class="btn btn-mini btn-primario" data-accion="usar-sugerencia">Usar sugerencia</button>' : "") + "</div>" +
      '<div class="tabla-envoltura"><table class="tabla tabla-mini"><thead><tr><th>Producto</th><th class="num">Vendidas</th><th class="num">Rotación</th><th class="num">Saldo</th><th class="num">Sugerido</th></tr></thead><tbody>' +
      s.map(function (x) { return "<tr><td>" + esc(x.producto) + "</td><td class='num'>" + num(x.ventas) + "</td><td class='num'>" + num(x.rotacion) + " %</td><td class='num'>" + num(x.saldo) + "</td><td class='num'><b>" + num(x.sugerido) + "</b></td></tr>"; }).join("") +
      '</tbody></table></div><small class="ayuda">Sugerido = máx(0, vendidas − saldo). Rotación = vendidas ÷ (inicial + entregas).</small></div>';
  }

  // ================= IMPACTO ECONÓMICO (administrador y contador) =================
  var simHoras = 6, simAnios = 3;
  function barra(valor, max, cls) { return '<span class="barra-cmp ' + (cls || "") + '"><span style="width:' + Math.max(2, Math.round(valor / max * 100)) + '%"></span></span>'; }
  VISTAS.impacto = function () {
    var ind = RCE.indicadores(), antes = RCE.antes(), desp = RCE.despues(6);
    var tA = RCE.suma(antes), tD = RCE.suma(desp), max = Math.max(tA, tD);
    var k = '<div class="kpis">' +
      kpiFijo("CAUE con ReCuenta", usd(RCE.caueReCuenta(6)), "Costo anual uniforme equivalente", "i-impacto") +
      kpiFijo("CAUE del proceso actual", usd(RCE.caueActual()), "Hojas de cálculo", "i-liquidacion") +
      kpiFijo("Ventaja anual", usd(RCE.simular(6).ventaja), "A favor de ReCuenta", "i-ok", "kpi-dinero") +
      kpiFijo("TIR", String(ind.tir).replace(".", ",") + " %", "Mayor que la tasa del 10 %", "i-flecha") +
      "</div>" +
      '<div class="chips-ind"><span class="chip chip-abierto">B/C ' + String(ind.bc).replace(".", ",") + '</span><span class="chip chip-abierto">Payback ' + String(ind.payback).replace(".", ",") + ' años</span>' +
      '<span class="chip chip-abierto">Vida útil económica ' + ind.vidaUtil + ' años (CAUE mínimo ' + usd(ind.caueMinimo) + ')</span><span class="chip chip-abierto">P = ' + usd(RCE.INVERSION.P) + " · S = " + usd(RCE.INVERSION.S) + " · N = " + RCE.INVERSION.N + " · i = 10 %</span></div>";

    var filas = antes.map(function (a, i) {
      var d = desp[i];
      return "<tr><td>" + esc(a.concepto) + (a.detalle ? "<small class='sub'>Antes: " + a.detalle + "</small>" : "") + (d.concepto !== a.concepto ? "<small class='sub'>Después: " + esc(d.concepto) + "</small>" : (d.detalle ? "<small class='sub'>Después: " + d.detalle + "</small>" : "")) +
        "</td><td class='num'>" + usd(a.valor) + barra(a.valor, max, "barra-antes") + "</td><td class='num'>" + usd(d.valor) + barra(d.valor, max, "barra-despues") + "</td></tr>";
    }).join("");
    var tabla = '<section class="tarjeta"><h2 class="tarjeta-titulo">Costos anuales: antes y después</h2><div class="tabla-envoltura"><table class="tabla tabla-impacto"><thead><tr><th>Concepto</th><th class="num">Antes (hojas de cálculo)</th><th class="num">Después (con ReCuenta)</th></tr></thead><tbody>' + filas +
      "</tbody><tfoot><tr class='total'><td>Total al año</td><td class='num'>" + usd(tA) + barra(tA, max, "barra-antes") + "</td><td class='num'>" + usd(tD) + barra(tD, max, "barra-despues") + "</td></tr></tfoot></table></div>" +
      '<p class="ayuda">CAUE de ReCuenta = (P − S)(A/P, 10 %, 5) + S·i + costo anual = (7.000 − 500)(0,2638) + 50 + 3.876.</p></section>';

    var sim = '<section class="tarjeta"><h2 class="tarjeta-titulo">Simulador: horas semanales de conciliación con ReCuenta</h2>' +
      '<label class="deslizador"><span>Horas por semana: <b id="sim-h">' + simHoras + '</b></span><input type="range" id="sim-horas" min="4" max="15" step="1" value="' + simHoras + '" aria-label="Horas semanales con ReCuenta"></label>' +
      '<div id="sim-res"></div><p class="ayuda">Punto de equilibrio: <b>' + num(Math.round(RCE.equilibrioHoras())) + " h</b> por semana (" + String(RCE.equilibrioHoras().toFixed(2)).replace(".", ",") + " h). Desde ahí, ReCuenta deja de convenir.</p></section>";

    var tablaN = [1, 2, 3, 4, 5].map(function (n) { var c = RCE.comparar(n); return '<tr data-n="' + n + '"><td>' + n + "</td><td class='num'>" + usd(c.residual) + "</td><td class='num'>" + usd(c.compra) + "</td><td class='num'>" + usd(c.suscripcion) + "</td><td>" + (c.conviene === "compra" ? "Compra" : "Suscripción") + "</td></tr>"; }).join("");
    var memb = '<section class="tarjeta"><h2 class="tarjeta-titulo">¿Compra o suscripción («membresía»)?</h2>' +
      '<p class="ayuda">Compra: ' + usd(7000) + " + " + usd(1500) + " al año de licencia y soporte. Suscripción: " + usd(500) + " de activación + " + usd(280) + " al mes.</p>" +
      '<label class="deslizador"><span>Años de uso: <b id="memb-n">' + simAnios + '</b></span><input type="range" id="memb-anios" min="1" max="5" step="1" value="' + simAnios + '" aria-label="Años de uso"></label>' +
      '<div id="memb-res"></div><div class="tabla-envoltura"><table class="tabla tabla-memb"><thead><tr><th>Años</th><th class="num">Valor residual</th><th class="num">CAUE compra</th><th class="num">CAUE suscripción</th><th>Conviene</th></tr></thead><tbody>' + tablaN + "</tbody></table></div>" +
      '<p class="ayuda">CAUE compra(n) = (7.000 − Sₙ)(A/P, 10 %, n) + Sₙ·0,10 + 3.876. CAUE suscripción(n) = 500·(A/P, 10 %, n) + 2.376 + 3.360.</p></section>';

    return encabezado("Impacto económico", "Qué cambia para la distribuidora al pasar de hojas de cálculo a ReCuenta.") + k + tabla + sim + memb +
      '<p class="nota nota-info">' + ico("i-alerta") + "Cifras del archivo Calculos_ReCuenta.xlsx (supuestos académicos).</p>";
  };
  function kpiFijo(t, v, s, icono, cls) {
    return '<div class="kpi ' + (cls || "") + '"><span class="kpi-ico">' + ico(icono) + '</span><span class="kpi-txt"><span class="kpi-titulo">' + t + '</span><span class="kpi-valor">' + v + '</span><span class="kpi-sub">' + s + "</span></span></div>";
  }
  ENLACES.impacto = function (v) {
    function pintarSim() {
      var r = RCE.simular(simHoras);
      $("#sim-h", v).textContent = simHoras;
      $("#sim-res", v).innerHTML = '<div class="sim-res ' + (r.ventaja > 0 ? "sim-si" : "sim-no") + '"><div><span class="sub">CAUE con ReCuenta</span><b id="sim-caue">' + usd(r.caue) + "</b></div>" +
        '<div><span class="sub">CAUE actual</span><b>' + usd(r.actual) + '</b></div><div><span class="sub">Ventaja anual</span><b id="sim-ventaja">' + usd(r.ventaja) + "</b></div>" +
        '<div class="sim-decision"><span class="sub">Decisión</span><b id="sim-decision">' + r.decision + "</b></div></div>";
    }
    function pintarMemb() {
      var c = RCE.comparar(simAnios);
      $("#memb-n", v).textContent = simAnios;
      $("#memb-res", v).innerHTML = '<div class="sim-res sim-si"><div><span class="sub">CAUE compra</span><b id="memb-compra">' + usd(c.compra) + '</b></div><div><span class="sub">CAUE suscripción</span><b id="memb-susc">' + usd(c.suscripcion) + "</b></div>" +
        '<div class="sim-decision"><span class="sub">Conviene</span><b id="memb-conviene">' + (c.conviene === "compra" ? "la compra" : "la suscripción") + "</b><small class='sub'>Ahorra " + usd(c.diferencia) + " al año</small></div></div>";
      $$(".tabla-memb tr[data-n]", v).forEach(function (tr) { tr.classList.toggle("fila-editando", Number(tr.dataset.n) === simAnios); });
    }
    $("#sim-horas", v).addEventListener("input", function (e) { simHoras = Number(e.target.value); pintarSim(); });
    $("#memb-anios", v).addEventListener("input", function (e) { simAnios = Number(e.target.value); pintarMemb(); });
    pintarSim(); pintarMemb();
  };

  // ================= USUARIOS (solo administrador) =================
  function alcanceUsuario(u) {
    if (u.perfil === "repartidor") return (u.tiendas || []).map(function (id) { return tienda(id).nombre; }).join(", ") || "Sin tiendas";
    if (u.perfil === "tienda") return tienda(u.tiendaId).nombre;
    return "Todas las tiendas";
  }
  VISTAS.usuarios = function () {
    var d = RC.get(), u = edicion.usuario ? RC.porId(d.usuarios, edicion.usuario) : null;
    var esYo = u && u.id === usuario.id;
    var perfilSel = u ? u.perfil : "";
    var rutas = u ? (u.tiendas || []) : [];
    var form = '<form class="tarjeta form" id="form-usuario" novalidate><h2 class="tarjeta-titulo">' + (u ? "Editar usuario" : "Nuevo usuario") + "</h2>" +
      '<div class="rejilla-2">' +
      campo("Nombre y apellido *", '<input name="nombre" required maxlength="60" autocomplete="off" value="' + esc(u ? u.nombre : "") + '" placeholder="Ej.: Carlos Vera">', "ancho") +
      campo("Correo *", '<input name="correo" type="email" required maxlength="80" autocomplete="off" value="' + esc(u ? u.correo : "") + '" placeholder="nombre@empresa.com">', "ancho") +
      campo("Celular *", '<input name="celular" inputmode="tel" required maxlength="10" value="' + esc(u ? u.celular : "") + '" placeholder="09XXXXXXXX">') +
      campo("Perfil *", '<select name="perfil" required' + (esYo ? " disabled" : "") + '><option value="">Selecciona…</option>' + Object.keys(RC.PERFILES).map(function (k) {
        return '<option value="' + k + '"' + (k === perfilSel ? " selected" : "") + ">" + RC.PERFILES[k] + "</option>";
      }).join("") + "</select>") +
      campo("Estado", '<select name="activo"' + (esYo ? " disabled" : "") + '><option value="1">Activo</option><option value="0"' + (u && !u.activo ? " selected" : "") + ">Inactivo</option></select>") +
      '<div class="campo ancho" id="grupo-rutas"' + (perfilSel === "repartidor" ? "" : " hidden") + '><span>Tiendas de la ruta * <small>(al menos una)</small></span><div class="checks" data-campo="tiendas">' +
      d.tiendas.map(function (t) { return '<label><input type="checkbox" name="tiendas" value="' + t.id + '"' + (rutas.indexOf(t.id) >= 0 ? " checked" : "") + ">" + esc(t.nombre) + (t.activa ? "" : " (inactiva)") + "</label>"; }).join("") +
      "</div></div>" +
      '<div class="campo ancho" id="grupo-tienda"' + (perfilSel === "tienda" ? "" : " hidden") + '><span>Tienda vinculada *</span><select name="tiendaId">' + '<option value="">Selecciona…</option>' +
      d.tiendas.map(function (t) { return '<option value="' + t.id + '"' + (u && u.tiendaId === t.id ? " selected" : "") + ">" + esc(t.nombre) + "</option>"; }).join("") + "</select></div>" +
      "</div>" + (esYo ? '<p class="ayuda">Es tu propio usuario: no puedes cambiar tu perfil ni desactivarte.</p>' : '<p class="ayuda">El nuevo usuario aparece de inmediato en la pantalla de acceso, dentro de su perfil.</p>') +
      '<p class="error-form" role="alert"></p><div class="form-acciones">' +
      (u ? '<button type="button" class="btn btn-secundario" data-accion="cancelar-usuario">Cancelar edición</button>' : "") +
      '<button class="btn btn-primario" type="submit">' + ico(u ? "i-ok" : "i-mas") + (u ? "Guardar cambios" : "Crear usuario") + "</button></div></form>";
    var activos = d.usuarios.filter(function (x) { return x.activo; }).length;
    var tabla = '<div class="tarjeta"><h2 class="tarjeta-titulo">Usuarios (' + d.usuarios.length + " · " + activos + ' activos)</h2><div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Usuario</th><th>Perfil</th><th>Tiendas</th><th>Estado</th><th></th></tr></thead><tbody>' +
      d.usuarios.map(function (x) {
        var yo = x.id === usuario.id;
        return "<tr" + (edicion.usuario === x.id ? ' class="fila-editando"' : "") + "><td><strong>" + esc(x.nombre) + (yo ? " (tú)" : "") + "</strong><small class='sub'>" + esc(x.correo) + " · " + esc(x.celular) + "</small></td><td>" + rol(x) + "</td><td>" + esc(alcanceUsuario(x)) + "</td><td>" +
          (x.activo ? '<span class="estado estado-ok">Activo</span>' : '<span class="estado estado-gris">Inactivo</span>') + '</td><td class="acciones">' +
          '<button class="btn btn-mini" data-accion="editar-usuario" data-id="' + x.id + '">' + ico("i-editar") + "Editar</button>" +
          (yo ? "" : '<button class="btn btn-mini' + (x.activo ? " btn-peligro" : "") + '" data-accion="estado-usuario" data-id="' + x.id + '" data-activo="' + (x.activo ? "0" : "1") + '">' + (x.activo ? "Desactivar" : "Activar") + "</button>") +
          "</td></tr>";
      }).join("") + "</tbody></table></div></div>";
    return encabezado("Usuarios", "Crea, edita y activa o desactiva a quienes usan ReCuenta. No se borran: un usuario inactivo no puede ingresar.") + '<div class="dos-columnas">' + form + tabla + "</div>";
  };
  ENLACES.usuarios = function (v) {
    var form = $("#form-usuario", v);
    function mostrarGrupos() {
      var p = form.perfil.value;
      $("#grupo-rutas", v).hidden = p !== "repartidor";
      $("#grupo-tienda", v).hidden = p !== "tienda";
    }
    form.perfil.addEventListener("change", mostrarGrupos);
    validador(form, function () {
      var p = form.perfil.value;
      var reglas = [
        [form.nombre, function (el) { return RCV.nombrePersona(el.value, { apellido: true, etiqueta: "el nombre y apellido" }); }],
        [form.correo, function (el) { return RCV.correo(el.value, function (s) { return RC.usuarios().some(function (u) { return u.correo.toLowerCase() === s && u.id !== edicion.usuario; }); }); }],
        [form.celular, function (el) { return RCV.telefono(el.value, true); }],
        [form.perfil, function (el) { return RCV.seleccion(el.value, "el perfil"); }]
      ];
      if (p === "repartidor") reglas.push([$('[data-campo="tiendas"]', form), function (el) { return $$("input:checked", el).length ? "" : "Asigna al menos una tienda a la ruta del repartidor."; }]);
      if (p === "tienda") reglas.push([form.tiendaId, function (el) { return RCV.seleccion(el.value, "la tienda vinculada"); }]);
      return reglas;
    });
    v.addEventListener("click", function (e) {
      var b = e.target.closest("[data-accion]");
      if (!b) return;
      var a = b.dataset.accion;
      if (a === "editar-usuario") { edicion.usuario = b.dataset.id; render(); $("#form-usuario input").focus(); }
      if (a === "cancelar-usuario") { edicion.usuario = null; render(); }
      if (a === "estado-usuario") {
        var u = RC.porId(RC.get().usuarios, b.dataset.id), activar = b.dataset.activo === "1";
        confirmar(activar ? "Activar usuario" : "Desactivar usuario", activar ? u.nombre + " podrá volver a ingresar con el perfil " + rol(u) + "." : u.nombre + " ya no podrá ingresar. Sus registros se conservan.", activar ? "Activar" : "Desactivar").then(function (ok) {
          if (!ok) return;
          try { RC.cambiarEstadoUsuario(u.id, activar); toast((activar ? "Usuario activado: " : "Usuario desactivado: ") + u.nombre + "."); render(); } catch (err) { toast(err.message, "error"); }
        });
      }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.validarTodo()) return;
      enviarUnaVez(form, function () {
        var nuevo = !edicion.usuario;
        var previo = nuevo ? null : RC.porId(RC.get().usuarios, edicion.usuario);
        var u = RC.guardarUsuario({
          id: edicion.usuario, nombre: form.nombre.value, correo: form.correo.value, celular: form.celular.value,
          perfil: form.perfil.disabled ? previo.perfil : form.perfil.value,
          activo: form.activo.disabled ? previo.activo : form.activo.value === "1",
          tiendas: $$('[name="tiendas"]:checked', form).map(function (c) { return c.value; }), tiendaId: form.tiendaId.value
        });
        edicion.usuario = null;
        toast(nuevo ? "Usuario creado: " + u.nombre + " (" + rol(u) + ")." : "Cambios guardados en " + u.nombre + ".");
        render();
      });
    });
  };

  // ================= BITÁCORA =================
  VISTAS.bitacora = function () {
    var todos = RC.bitacora();
    var lista = todos.filter(function (b) { return (!filtroBitacora.tipo || b.tipo === filtroBitacora.tipo) && (!filtroBitacora.usuario || b.usuarioId === filtroBitacora.usuario); });
    var usuariosCon = {};
    todos.forEach(function (b) { if (b.usuarioId) usuariosCon[b.usuarioId] = b.usuario; });
    var filtros = '<div class="rejilla-2 filtros-bitacora">' +
      campo("Tipo de acción", '<select id="b-tipo"><option value="">Todos los tipos</option>' + Object.keys(RC.TIPOS_BITACORA).map(function (k) {
        return '<option value="' + k + '"' + (filtroBitacora.tipo === k ? " selected" : "") + ">" + RC.TIPOS_BITACORA[k] + "</option>";
      }).join("") + "</select>") +
      campo("Usuario", '<select id="b-usuario"><option value="">Todos los usuarios</option>' + Object.keys(usuariosCon).map(function (id) {
        return '<option value="' + id + '"' + (filtroBitacora.usuario === id ? " selected" : "") + ">" + esc(usuariosCon[id]) + "</option>";
      }).join("") + "</select>") + "</div>";
    var MAX = 300;
    var tabla = lista.length ? '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>' +
      lista.slice(0, MAX).map(function (b) {
        var f = b.fecha.split("T");
        return '<tr><td class="bitacora-fecha">' + fecha(f[0]) + "<small class='sub'>" + (f[1] || "").slice(0, 5) + "</small></td><td>" + esc(b.usuario) + '</td><td><span class="estado ' + (b.tipo === "gps" ? "estado-alerta" : "estado-revisada") + '">' + (RC.TIPOS_BITACORA[b.tipo] || b.tipo) + "</span></td><td>" + esc(b.detalle) + "</td></tr>";
      }).join("") + "</tbody></table></div>" + (lista.length > MAX ? '<p class="ayuda">Se muestran las ' + MAX + " acciones más recientes de " + lista.length + ".</p>" : "") :
      vacio("i-bitacora", "Sin acciones con estos filtros", "Cambia el tipo o el usuario para ver más registros.");
    return encabezado("Bitácora", "Cada acción queda registrada con fecha, hora, usuario y detalle. Sirve para auditar quién hizo qué.") +
      '<section class="tarjeta">' + filtros + '<p class="ayuda">' + lista.length + " acción(es)</p>" + tabla + "</section>";
  };
  ENLACES.bitacora = function (v) {
    $("#b-tipo", v).addEventListener("change", function (e) { filtroBitacora.tipo = e.target.value; render(); });
    $("#b-usuario", v).addEventListener("change", function (e) { filtroBitacora.usuario = e.target.value; render(); });
  };

  // Resumen de la liquidación para WhatsApp: tienda, período, productos, subtotal, ajuste, total y diferencias.
  function textoLiquidacion(l) {
    function m(n) { return "$" + Number(n).toFixed(2).replace(".", ","); }
    var x = ["*ReCuenta · Liquidación de consignación*", "Tienda: " + l.tienda, "Período: " + l.periodoNombre, "Estado: " + l.estado, "Productos vendidos:"];
    l.lineas.forEach(function (p) { x.push("• " + p.producto + ": " + p.cantidad + " × " + m(p.precio) + " = " + m(p.subtotal)); });
    x.push("Subtotal: " + m(l.subtotal));
    x.push("Ajuste" + (l.ajustePct ? " (" + l.ajusteNombre + ", " + String(l.ajustePct).replace(".", ",") + " %)" : "") + ": " + (l.ajuste < 0 ? "−" : "") + m(Math.abs(l.ajuste)));
    x.push("*Total a pagar: " + m(l.total) + "*");
    if (l.diferencias.length) {
      x.push("Diferencias por revisar (no se cobran):");
      l.diferencias.forEach(function (d) { x.push("• " + d.producto + ": " + d.tipo.toLowerCase() + " de " + d.unidades + " u. (valor referencial " + m(d.valorReferencial) + ")" + (d.revisada ? " · revisada" : "")); });
    } else x.push("Sin diferencias por revisar.");
    if (l.pendientes.length) x.push("Pendiente de conteo: " + l.pendientes.map(function (p) { return p.producto; }).join(", "));
    x.push("La cuenta que los dos ven igual.");
    return x.join("\n");
  }

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
    usuario = RC.sesion();
    $("#aviso-almacenamiento").hidden = RC.persistenciaOk();
    if (!usuario) {
      RC.cerrarSesion();
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
    if (a === "entrar-como") entrarComo(b.dataset.id);
    if (a === "cerrar-selector") $("#selector-usuario").hidden = true;
    if (a === "comprobante") abrirComprobante(b.dataset.id);
    if (a === "cerrar-detalle") cerrarDetalle();
    if (a === "confirmar-recepcion") {
      try { RC.confirmarRecepcion(b.dataset.id); toast("Recepción confirmada. Queda registrada en la bitácora."); render(); abrirComprobante(b.dataset.id); }
      catch (err) { toast(err.message, "error"); }
    }
    if (a === "salir") confirmar("Cerrar sesión", "¿Quieres salir de ReCuenta? Tus registros quedan guardados en este navegador.", "Cerrar sesión").then(function (ok) { if (ok) salir(); });
    if (a === "menu") document.body.classList.toggle("menu-abierto");
    if (a === "restaurar") confirmar("Restaurar datos de ejemplo", "Se borrarán todos los cambios hechos en este navegador y se cargará de nuevo el caso de Milagro (entrega 100, ventas 70, devoluciones 25, conteo pendiente). ¿Continuar?", "Restaurar").then(function (ok) {
      if (!ok) return;
      RC.restaurarDemo();
      Object.keys(edicion).forEach(function (k) { edicion[k] = null; });
      abierta = null; filtroEstado = "";
      filtroBitacora = { tipo: "", usuario: "" };
      RC.guardarFiltro({ tienda: "T1", periodo: "2026-11" });
      // Si el usuario de la sesión no existe en los datos de ejemplo, se vuelve al acceso.
      if (!RC.actor()) { salirSinConfirmar("Datos de ejemplo restaurados. Tu usuario no existe en el caso de ejemplo: vuelve a ingresar."); return; }
      filtro = RC.filtro();
      toast("Datos de ejemplo restaurados.");
      irA("inicio");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("#selector-usuario").hidden) $("#selector-usuario").hidden = true;
    if (!$("#detalle").hidden) cerrarDetalle();
  });
  $("#detalle").addEventListener("click", function (e) { if (e.target.id === "detalle") cerrarDetalle(); });
  $("#f-tienda").addEventListener("change", function (e) { cambiarFiltro({ tienda: e.target.value }); });
  $("#f-periodo").addEventListener("change", function (e) { cambiarFiltro({ periodo: e.target.value }); });
  window.addEventListener("hashchange", function () { if (usuario) { abierta = null; render(); $("#vista").focus({ preventScroll: true }); window.scrollTo(0, 0); } });

  // Primera visita: deja el caso de Doña Rosa como tienda activa para la demostración.
  if (RC.primeraVisita()) RC.guardarFiltro({ tienda: "T1", periodo: "2026-11" });
  arrancar();

  window.RC_APP = { csvLiquidacion: csvLiquidacion }; // usado por las pruebas
})();

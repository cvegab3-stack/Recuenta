/*
 * ReCuenta - Reglas de validación compartidas.
 * Cada función devuelve "" si el valor es válido o el mensaje de error en español.
 * Las usan store.js (que rechaza el guardado) y app.js (que muestra el mensaje debajo de cada campo).
 */
(function () {
  "use strict";

  var PROHIBIDOS = /[<>{}]/;
  var LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";

  function txt(v) { return v === undefined || v === null ? "" : String(v).trim(); }
  function hoy() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fechaValida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }
  function fechaTxt(s) { var p = s.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }

  var V = {
    hoy: hoy,
    fechaValida: fechaValida,

    // Selectores obligatorios
    seleccion: function (v, que) { return txt(v) ? "" : "Selecciona " + (que || "una opción") + "."; },

    // Nombres de personas: contacto, recibido por, usuario.
    nombrePersona: function (v, opciones) {
      var s = txt(v).replace(/\s+/g, " "), o = opciones || {};
      if (!s) return o.etiqueta ? "Escribe " + o.etiqueta + "." : "Escribe el nombre.";
      if (s.length < 3 || s.length > 60) return "El nombre debe tener de 3 a 60 caracteres.";
      if (!new RegExp("^[" + LETRAS + "' .-]+$").test(s)) return "El nombre solo admite letras, espacios, tildes, ñ y los signos ' . -";
      if (!new RegExp("[" + LETRAS + "]").test(s)) return "El nombre debe contener letras.";
      if (o.apellido && s.split(" ").filter(function (x) { return x.replace(/[.'-]/g, "").length >= 2; }).length < 2) return "Escribe nombre y apellido.";
      return "";
    },

    // Nombre de tienda o de producto. `existe(nombre)` indica si ya hay otro con ese nombre.
    nombreCosa: function (v, que, existe) {
      var s = txt(v);
      if (!s) return "Escribe el nombre " + que + ".";
      if (s.length < 3 || s.length > 60) return "El nombre debe tener de 3 a 60 caracteres.";
      if (PROHIBIDOS.test(s)) return "El nombre no puede contener < > { }.";
      if (existe && existe(s)) return "Ya existe " + (que === "de la tienda" ? "una tienda" : "un producto") + " con ese nombre.";
      return "";
    },

    direccion: function (v) {
      var s = txt(v);
      if (!s) return "Escribe la dirección.";
      if (s.length < 5 || s.length > 90) return "La dirección debe tener de 5 a 90 caracteres.";
      if (PROHIBIDOS.test(s)) return "La dirección no puede contener < > { }.";
      return "";
    },

    // Ecuador: celular 09 + 8 dígitos o fijo 0[2-7] + 7 dígitos.
    telefono: function (v, soloCelular) {
      var s = txt(v).replace(/[\s-]/g, "");
      if (!s) return soloCelular ? "Escribe el celular." : "Escribe el celular o teléfono.";
      if (/^09\d{8}$/.test(s)) return "";
      if (!soloCelular && /^0[2-7]\d{7}$/.test(s)) return "";
      return soloCelular ? "El celular debe tener 10 dígitos y empezar con 09 (ej.: 0991234567)." :
        "Escribe un celular (09 y 8 dígitos) o un teléfono fijo (02 a 07 y 7 dígitos).";
    },
    limpiarTelefono: function (v) { return txt(v).replace(/[\s-]/g, ""); },

    correo: function (v, existe) {
      var s = txt(v).toLowerCase();
      if (!s) return "Escribe el correo.";
      if (s.length > 80 || !/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(s)) return "Escribe un correo válido (ej.: nombre@empresa.com).";
      if (existe && existe(s)) return "Ya existe un usuario con ese correo.";
      return "";
    },

    codigo: function (v, existe) {
      var s = txt(v).toUpperCase();
      if (!s) return "Escribe el código del producto.";
      if (!/^[A-Z0-9-]{3,12}$/.test(s)) return "El código debe tener de 3 a 12 caracteres: letras A-Z, números o -.";
      if (existe && existe(s)) return "Ya existe un producto con ese código.";
      return "";
    },

    unidad: function (v) {
      var s = txt(v);
      if (!s) return "Escribe la unidad (ej.: funda, botella).";
      if (!new RegExp("^[" + LETRAS + "]{2,20}$").test(s)) return "La unidad debe tener de 2 a 20 letras, sin números ni espacios.";
      return "";
    },

    precio: function (v) {
      var s = txt(v).replace(",", ".");
      if (!s) return "Escribe el precio.";
      if (!/^\d+(\.\d+)?$/.test(s)) return "El precio debe ser un número.";
      if (!/^\d+(\.\d{1,2})?$/.test(s)) return "El precio admite como máximo dos decimales.";
      var n = Number(s);
      if (n <= 0) return "El precio debe ser mayor que 0.";
      if (n > 999.99) return "El precio no puede superar $999,99.";
      return "";
    },

    ajustePct: function (v) {
      var s = txt(v).replace(",", ".");
      if (s === "") return "Escribe el ajuste (0 si no hay ajuste).";
      if (!/^\d+(\.\d+)?$/.test(s)) return "El ajuste debe ser un número.";
      if (!/^\d+(\.\d)?$/.test(s)) return "El ajuste admite un solo decimal.";
      var n = Number(s);
      if (n < 0 || n > 50) return "El ajuste debe estar entre 0 % y 50 %.";
      return "";
    },
    ajusteNombre: function (v, pct) {
      var s = txt(v);
      if (Number(String(pct).replace(",", ".")) > 0 && !s) return "Escribe el nombre del ajuste (ej.: Descuento por exhibición).";
      if (s && (s.length < 3 || s.length > 40)) return "El nombre del ajuste debe tener de 3 a 40 caracteres.";
      if (PROHIBIDOS.test(s)) return "El nombre del ajuste no puede contener < > { }.";
      return "";
    },

    // Fecha dentro del período (AAAA-MM) y no posterior a hoy.
    fecha: function (v, per, nombrePeriodo) {
      var s = txt(v);
      if (!s) return "Indica la fecha.";
      if (!fechaValida(s)) return "La fecha no es válida.";
      if (per && s.slice(0, 7) !== per) return "La fecha debe estar dentro del período " + (nombrePeriodo || per) + ".";
      if (s > hoy()) return "La fecha no puede ser posterior a hoy (" + fechaTxt(hoy()) + ").";
      return "";
    },

    // Cantidades de movimientos: enteros de 1 a 10000, sin superar lo disponible.
    cantidad: function (v, max, detalleMax) {
      var s = txt(v);
      if (!s) return "Escribe la cantidad.";
      if (!/^\d+$/.test(s)) return "La cantidad debe ser un número entero.";
      var n = Number(s);
      if (n < 1 || n > 10000) return "La cantidad debe estar entre 1 y 10000.";
      if (max !== undefined && max !== null && n > max) return "Solo hay " + Math.max(max, 0) + " u. disponibles" + (detalleMax ? " " + detalleMax : "") + ".";
      return "";
    },

    conteo: function (v) {
      var s = txt(v);
      if (!s) return "Escribe el conteo (0 si no hay unidades).";
      if (!/^\d+$/.test(s)) return "El conteo debe ser un número entero igual o mayor que 0.";
      if (Number(s) > 100000) return "El conteo no puede superar 100000.";
      return "";
    },

    // Fecha de vencimiento de un lote: opcional, válida y posterior a la entrega.
    vencimiento: function (v, fechaEntrega) {
      var s = txt(v);
      if (!s) return "";
      if (!fechaValida(s)) return "La fecha de vencimiento no es válida.";
      if (fechaEntrega && s <= fechaEntrega) return "El vencimiento debe ser posterior a la fecha de entrega.";
      return "";
    },

    // Coordenadas dentro de Ecuador (incluye Galápagos).
    latitud: function (v) {
      var s = txt(v).replace(",", ".");
      if (!s) return "Escribe la latitud o marca el punto en el mapa.";
      var n = Number(s);
      if (!isFinite(n)) return "La latitud debe ser un número.";
      if (n < -5.1 || n > 1.7) return "La latitud debe estar dentro de Ecuador (−5,1 a 1,7).";
      return "";
    },
    longitud: function (v) {
      var s = txt(v).replace(",", ".");
      if (!s) return "Escribe la longitud o marca el punto en el mapa.";
      var n = Number(s);
      if (!isFinite(n)) return "La longitud debe ser un número.";
      if (n < -92.1 || n > -75.1) return "La longitud debe estar dentro de Ecuador (−92,1 a −75,1).";
      return "";
    },

    // Textos libres: observación (5 a 200) o justificación (10 a 200).
    texto: function (v, min, max, que, opcional) {
      var s = txt(v);
      if (!s && opcional) return "";
      if (!s) return "Escribe " + que + ".";
      if (s.length < min || s.length > max) return que.charAt(0).toUpperCase() + que.slice(1) + " debe tener de " + min + " a " + max + " caracteres.";
      if (PROHIBIDOS.test(s)) return "El texto no puede contener < > { }.";
      return "";
    },
    observacion: function (v) { return V.texto(v, 5, 200, "la observación"); },
    justificacion: function (v) { return V.texto(v, 10, 200, "la justificación"); },
    nota: function (v) {
      var s = txt(v);
      if (s.length > 80) return "La nota admite hasta 80 caracteres.";
      if (PROHIBIDOS.test(s)) return "La nota no puede contener < > { }.";
      return "";
    }
  };

  window.RCV = V;
})();

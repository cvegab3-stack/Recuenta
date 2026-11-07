/*
 * ReCuenta - Impacto económico (antes y después).
 * Cifras y fórmulas del archivo Calculos_ReCuenta.xlsx (supuestos académicos).
 */
(function () {
  "use strict";

  var I = 0.10;                       // tasa anual del proyecto
  var TARIFA_HORA = 3, SEMANAS = 52;  // costo de la hora de conciliación y semanas del año

  var ANTES = [
    { concepto: "Conciliación manual", detalle: "15 h/sem × $3 × 52", valor: 15 * TARIFA_HORA * SEMANAS },
    { concepto: "Diferencias no recuperadas", detalle: "", valor: 2160 },
    { concepto: "Devoluciones mal gestionadas", detalle: "", valor: 1200 },
    { concepto: "Herramientas (hojas de cálculo)", detalle: "", valor: 720 }
  ];
  var DESPUES_FIJOS = { diferencias: 840, devoluciones: 600, licencia: 1500 };
  var INVERSION = { P: 7000, S: 500, N: 5 };
  // Valor residual de la compra según los años de uso (1 a 5).
  var RESIDUAL = { 1: 5000, 2: 3500, 3: 2200, 4: 1200, 5: 500 };
  var SUSCRIPCION = { activacion: 500, mensual: 280 };

  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function suma(l) { return l.reduce(function (a, x) { return a + x.valor; }, 0); }
  // Factor de recuperación de capital (A/P, i, n)
  function AP(i, n) { var f = Math.pow(1 + i, n); return i * f / (f - 1); }
  // Factor de valor presente de una serie (P/A, i, n)
  function PA(i, n) { return 1 / AP(i, n); }

  function despues(horas) {
    var h = horas === undefined ? 6 : horas;
    return [
      { concepto: "Conciliación manual", detalle: h + " h/sem × $3 × 52", valor: h * TARIFA_HORA * SEMANAS },
      { concepto: "Diferencias no recuperadas", detalle: "", valor: DESPUES_FIJOS.diferencias },
      { concepto: "Devoluciones mal gestionadas", detalle: "", valor: DESPUES_FIJOS.devoluciones },
      { concepto: "Licencia y soporte de ReCuenta", detalle: "", valor: DESPUES_FIJOS.licencia }
    ];
  }

  // CAUE de ReCuenta = (P − S)(A/P, i, N) + S·i + costo anual con ReCuenta.
  function caueReCuenta(horas) {
    var P = INVERSION.P, S = INVERSION.S, N = INVERSION.N;
    return r2((P - S) * AP(I, N) + S * I + suma(despues(horas)));
  }
  function caueActual() { return suma(ANTES); }

  // Horas semanales en las que el CAUE con ReCuenta iguala al proceso actual.
  function equilibrioHoras() {
    var fijo = (INVERSION.P - INVERSION.S) * AP(I, INVERSION.N) + INVERSION.S * I + DESPUES_FIJOS.diferencias + DESPUES_FIJOS.devoluciones + DESPUES_FIJOS.licencia;
    return (caueActual() - fijo) / (TARIFA_HORA * SEMANAS);
  }

  function simular(horas) {
    var caue = caueReCuenta(horas), ventaja = r2(caueActual() - caue);
    return { horas: horas, caue: caue, actual: caueActual(), ventaja: ventaja, decision: ventaja > 0 ? "Adquirir" : "Mantener el proceso actual" };
  }

  // Indicadores con el ahorro anual (antes − después) durante N años y el valor residual.
  function indicadores() {
    var ahorro = caueActual() - suma(despues(6));
    var P = INVERSION.P, S = INVERSION.S, N = INVERSION.N;
    function vpn(i) { var v = -P; for (var t = 1; t <= N; t++) v += ahorro / Math.pow(1 + i, t); return v + S / Math.pow(1 + i, N); }
    var lo = 0, hi = 2;
    for (var k = 0; k < 200; k++) { var mid = (lo + hi) / 2; if (vpn(mid) > 0) lo = mid; else hi = mid; }
    var beneficios = ahorro * PA(I, N) + S / Math.pow(1 + I, N);
    return {
      ahorroAnual: ahorro,
      tir: r2(lo * 100),
      bc: r2(beneficios / P),
      payback: r2(P / ahorro),
      vidaUtil: 5,
      caueMinimo: 6051.85            // valor del Excel (análisis de vida útil económica)
    };
  }

  // Compra (inversión + licencia) frente a suscripción ("membresía") según los años de uso.
  function caueCompra(n) {
    var S = RESIDUAL[n];
    return r2((INVERSION.P - S) * AP(I, n) + S * I + suma(despues(6)));
  }
  function caueSuscripcion(n) {
    var anualSinLicencia = suma(despues(6)) - DESPUES_FIJOS.licencia;   // 2376
    return r2(SUSCRIPCION.activacion * AP(I, n) + anualSinLicencia + SUSCRIPCION.mensual * 12);
  }
  function comparar(n) {
    var c = caueCompra(n), s = caueSuscripcion(n);
    return { n: n, compra: c, suscripcion: s, residual: RESIDUAL[n], conviene: c < s ? "compra" : "suscripcion", diferencia: r2(Math.abs(c - s)) };
  }

  window.RCE = {
    I: I, INVERSION: INVERSION, RESIDUAL: RESIDUAL, SUSCRIPCION: SUSCRIPCION,
    antes: function () { return ANTES.slice(); }, despues: despues, suma: suma, AP: AP,
    caueReCuenta: caueReCuenta, caueActual: caueActual, equilibrioHoras: equilibrioHoras,
    simular: simular, indicadores: indicadores, caueCompra: caueCompra, caueSuscripcion: caueSuscripcion, comparar: comparar
  };
})();

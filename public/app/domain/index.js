import * as ingresos from './ingresos-calculos.js';
import * as compras from './compras-calculos.js';
import * as donaciones from './donaciones-calculos.js';
import * as resumen from './resumen-calculos.js';
import * as agrupacion from './agrupacion-calculos.js';

const DOMAIN_VERSION = 'ControlEvent domain v25.9';

function safeCall(fn, fallback){
  try{ return fn(); }catch(error){
    console.warn('[v25.9/domain] Calculo modular no disponible', error);
    return fallback;
  }
}

function snapshotBudget(budget){
  return {
    ingresos: Number(budget?.ingresosDinero?.totalComprometido || budget?.operativa?.ingresos || 0),
    ingresado: Number(budget?.ingresosDinero?.totalIngresado || budget?.operativa?.ingresoDinero || 0),
    pendienteIngresos: Number(budget?.ingresosDinero?.pendiente || 0),
    gastoCompras: Number(budget?.operativa?.gastoCompras || 0),
    gastosOrganizacion: Number(budget?.operativa?.gastosOrganizacion || 0),
    pendienteCompras: Number(budget?.operativa?.pendiente || 0),
    saldoOperativo: Number(budget?.operativa?.saldoOperativo || 0),
    valorDonado: Number(budget?.donacionProducto?.valorDonado || 0)
  };
}

function compareSnapshots(a, b){
  const keys = Object.keys(a);
  return keys.filter(key => Math.abs(Number(a[key] || 0) - Number(b[key] || 0)) > 0.01);
}

export function createDomainCalculations(app){
  return {
    version: DOMAIN_VERSION,
    collabsForEvent: () => ingresos.collabsForEvent(app),
    comprasForEvent: () => compras.comprasForEvent(app),
    ingresoSummary: () => ingresos.ingresoSummary(app),
    budgetSummary: () => resumen.budgetSummary(app),
    summaryBySegmento: () => agrupacion.summaryBySegmento(app),
    summaryByDestino: () => agrupacion.summaryByDestino(app),
    summaryByTiendaTicket: () => agrupacion.summaryByTiendaTicket(app),
    donationSummary: () => donaciones.donationSummary(app),
    modules: {ingresos, compras, donaciones, resumen, agrupacion}
  };
}

export function installDomainCalculations(app, options = {}){
  const domainApi = createDomainCalculations(app);
  const mode = options.mode || 'shadow';
  const domain = {
    version: DOMAIN_VERSION,
    mode,
    api: domainApi,
    modules: domainApi.modules,
    compareWithLegacy(){
      const legacy = app?.calculations?.budgetSummary?.();
      const modular = domainApi.budgetSummary();
      const legacyShot = snapshotBudget(legacy);
      const modularShot = snapshotBudget(modular);
      const diff = compareSnapshots(legacyShot, modularShot);
      return {ok: diff.length === 0, diff, legacy: legacyShot, modular: modularShot};
    }
  };

  if(app){
    app.domain = domain;
    app.calculationsV259 = domainApi;
  }

  if(typeof window !== 'undefined'){
    window.ControlEventDomain = domain;
    window.__ceV259 = domain;
    const shouldCompare = window.localStorage?.getItem('controlevent:v25.9:compare') === '1';
    if(shouldCompare){
      setTimeout(() => {
        const result = safeCall(() => domain.compareWithLegacy(), null);
        if(result && !result.ok) console.warn('[v25.9/domain] Diferencias frente al calculo legado', result);
        else if(result) console.info('[v25.9/domain] Calculos modulares validados contra legado', result.modular);
      }, 0);
    }
  }

  return domain;
}

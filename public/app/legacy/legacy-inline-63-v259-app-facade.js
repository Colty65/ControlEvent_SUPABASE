/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #63. */
/* ==== v25.9: fachada estable para modularizacion progresiva ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const call = fn => typeof fn === 'function' ? (...args) => fn(...args) : undefined;
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{ window.__ceVersion = VERSION; }catch(_){ }
  }
  function buildApp(){
    const navigation = {
      get currentMainTab(){ try{ return currentMainTab; }catch(_){ return 'ingresos'; } },
      set currentMainTab(value){ try{ currentMainTab = value; }catch(_){ } },
      get currentMaintTab(){ try{ return currentMaintTab; }catch(_){ return 'personas'; } },
      set currentMaintTab(value){ try{ currentMaintTab = value; }catch(_){ } },
      get currentProductSort(){ try{ return currentProductSort; }catch(_){ return 'nombre'; } },
      set currentProductSort(value){ try{ currentProductSort = value; }catch(_){ } }
    };
    const app = {
      version: VERSION,
      versionFile: VERSION_FILE,
      get state(){ try{ return state; }catch(_){ return {}; } },
      get authUser(){ try{ return authUser; }catch(_){ return window.authUser || null; } },
      set authUser(value){ try{ authUser = value; }catch(_){ } window.authUser = value; },
      get accessUsers(){ try{ return accessUsers; }catch(_){ return []; } },
      navigation,
      selectors: {
        selectedEvent: call(typeof selectedEvent === 'function' ? selectedEvent : undefined),
        personaById: call(typeof personaById === 'function' ? personaById : undefined),
        productoById: call(typeof productoById === 'function' ? productoById : undefined),
        tiendaById: call(typeof tiendaById === 'function' ? tiendaById : undefined),
        personasForSelectedEvent: call(typeof personasForSelectedEvent === 'function' ? personasForSelectedEvent : undefined),
        tiendasForSelectedEvent: call(typeof tiendasForSelectedEvent === 'function' ? tiendasForSelectedEvent : undefined),
        productosForSelectedEvent: call(typeof productosForSelectedEvent === 'function' ? productosForSelectedEvent : undefined),
        collabsForEvent: call(typeof collabsForEvent === 'function' ? collabsForEvent : undefined),
        comprasForEvent: call(typeof comprasForEvent === 'function' ? comprasForEvent : undefined)
      },
      calculations: {
        ingresoSummary: call(typeof ingresoSummary === 'function' ? ingresoSummary : undefined),
        budgetSummary: call(typeof budgetSummary === 'function' ? budgetSummary : undefined),
        summaryBySegmento: call(typeof summaryBySegmento === 'function' ? summaryBySegmento : undefined),
        summaryByDestino: call(typeof summaryByDestino === 'function' ? summaryByDestino : undefined),
        summaryByTiendaTicket: call(typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : undefined)
      },
      actions: {
        render: call(typeof render === 'function' ? render : undefined),
        saveState: call(typeof saveState === 'function' ? saveState : undefined),
        pushStateToServer: call(typeof pushStateToServer === 'function' ? pushStateToServer : undefined),
        changeSelectedEvent: call(typeof changeSelectedEvent === 'function' ? changeSelectedEvent : undefined),
        renderHeader: call(typeof renderHeader === 'function' ? renderHeader : undefined),
        renderTabVisibility: call(typeof renderTabVisibility === 'function' ? renderTabVisibility : undefined),
        renderMainSelectors: call(typeof renderMainSelectors === 'function' ? renderMainSelectors : undefined),
        renderIngresosSummary: call(typeof renderIngresosSummary === 'function' ? renderIngresosSummary : undefined),
        renderColabs: call(typeof renderColabs === 'function' ? renderColabs : undefined),
        renderBudget: call(typeof renderBudget === 'function' ? renderBudget : undefined),
        renderCompras: call(typeof renderCompras === 'function' ? renderCompras : undefined),
        renderDonaciones: call(typeof renderDonaciones === 'function' ? renderDonaciones : undefined),
        renderMaintenance: call(typeof renderMaintenance === 'function' ? renderMaintenance : undefined),
        renderPermissions: call(typeof renderPermissions === 'function' ? renderPermissions : undefined),
        renderLockState: call(typeof renderLockState === 'function' ? renderLockState : undefined),
        renderGraficas: call(typeof renderGraficas === 'function' ? renderGraficas : undefined),
        fetchAccessUsers: call(typeof fetchAccessUsers === 'function' ? fetchAccessUsers : undefined),
        doLogin: call(typeof doLogin === 'function' ? doLogin : undefined),
        doLogout: call(typeof doLogout === 'function' ? doLogout : undefined),
        exportExcel: (...args) => {
          const fn = window.exportExcel || (typeof exportExcel === 'function' ? exportExcel : null);
          return typeof fn === 'function' ? fn(...args) : undefined;
        },
        exportSeedWorkbook: (...args) => {
          const fn = window.exportSeedWorkbook || (typeof exportSeedWorkbook === 'function' ? exportSeedWorkbook : null);
          return typeof fn === 'function' ? fn(...args) : undefined;
        }
      },
      modules: {
        get registry(){ return window.ControlEventModules || null; }
      }
    };
    window.ControlEventApp = app;
    window.__ceV258 = {version:VERSION, app};
    window.dispatchEvent(new CustomEvent('controlevent:app-ready', {detail:{app}}));
    return app;
  }
  applyVersion();
  buildApp();
})();

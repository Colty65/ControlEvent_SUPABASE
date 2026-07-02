export function getApp(){
  return window.ControlEventApp || null;
}

export function requireApp(){
  const app = getApp();
  if(!app) throw new Error('ControlEventApp no esta disponible todavia.');
  return app;
}

export function whenAppReady(handler){
  const app = getApp();
  if(app){
    handler(app);
    return () => {};
  }
  const listener = event => handler(event.detail?.app || getApp());
  window.addEventListener('controlevent:app-ready', listener, {once:true});
  return () => window.removeEventListener('controlevent:app-ready', listener);
}

export function callAction(name, ...args){
  const app = getApp();
  const fn = app?.actions?.[name] || app?.[name] || window[name];
  if(typeof fn !== 'function') return undefined;
  return fn(...args);
}


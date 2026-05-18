export const byId = id => document.getElementById(id);
export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function setHidden(element, hidden){
  if(element) element.classList.toggle('hidden', !!hidden);
}

export function setDisabled(element, disabled){
  if(!element) return;
  element.disabled = !!disabled;
  element.toggleAttribute('aria-disabled', !!disabled);
}

export function dispatch(name, detail = {}){
  window.dispatchEvent(new CustomEvent(name, {detail}));
}


import { getApp } from '../app-context.js';

export function getAuthUser(){
  return getApp()?.authUser || null;
}

export function role(){
  return String(getAuthUser()?.nivel || '').toUpperCase();
}

export function hasAuth(){
  return !!getAuthUser();
}

export function canWrite(){
  return ['RW', 'GD'].includes(role());
}

export function isGD(){
  return role() === 'GD';
}

export function isRW(){
  return role() === 'RW';
}

export function isRO(){
  return role() === 'RO';
}


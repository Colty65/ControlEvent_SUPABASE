async function requestJson(url, options = {}){
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? {'Content-Type':'application/json'} : {}),
      ...(options.headers || {})
    }
  });
  if(!response.ok){
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status} en ${url}`);
  }
  return response.json();
}

export function fetchState(){
  return requestJson('/api/state', {cache:'no-store'});
}

export function saveState(state){
  return requestJson('/api/state', {
    method:'PUT',
    body: JSON.stringify(state || {})
  });
}

export function login({identificacion, clave}){
  return requestJson('/api/login', {
    method:'POST',
    body: JSON.stringify({identificacion, clave})
  });
}

export function changePassword(payload){
  return requestJson('/api/change-password', {
    method:'POST',
    body: JSON.stringify(payload || {})
  });
}

export function fetchAccessUsers(){
  return requestJson('/api/access-users', {cache:'no-store'});
}

export function saveAccessUser(payload){
  return requestJson('/api/access-users', {
    method:'POST',
    body: JSON.stringify(payload || {})
  });
}

export function deleteAccessUser(identificacion){
  return requestJson('/api/access-users/' + encodeURIComponent(identificacion), {
    method:'DELETE'
  });
}

export function uploadTicketImage(payload){
  return requestJson('/api/ticket-images', {
    method:'POST',
    body: JSON.stringify(payload || {})
  });
}

export function deleteTicketImage(payload){
  return requestJson('/api/ticket-images', {
    method:'DELETE',
    body: JSON.stringify(payload || {})
  });
}

export function health(){
  return requestJson('/api/health', {cache:'no-store'});
}


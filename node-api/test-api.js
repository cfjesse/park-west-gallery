const BASE = 'http://localhost:3000/api';
let token = '';
let createdId = '';

async function req(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

function assert(label, status, json, expectedStatus, check) {
  const statusOk = status === expectedStatus;
  const checkOk = check ? check(json) : true;
  const pass = statusOk && checkOk;
  console.log(`${pass ? '✅' : '❌'} [${status}] ${label}${!pass ? ` — expected ${expectedStatus}, got ${status}` : ''}`);
  if (!pass) console.log('   Body:', JSON.stringify(json));
}

async function run() {
  console.log('\n=== HEALTH ===');
  const health = await req('GET', '/health', null, false);
  assert('GET /health', health.status, health.json, 200, j => j.status === 'ok');

  console.log('\n=== AUTH ===');

  const badLogin = await req('POST', '/auth/login', { username: 'nobody', password: 'wrong' }, false);
  assert('POST /auth/login — invalid credentials', badLogin.status, badLogin.json, 401);

  const missingFields = await req('POST', '/auth/login', { username: 'accountant1' }, false);
  assert('POST /auth/login — missing password', missingFields.status, missingFields.json, 400);

  const loginRes = await req('POST', '/auth/login', { username: 'accountant1', password: 'Accountant@123' }, false);
  assert('POST /auth/login — accountant1', loginRes.status, loginRes.json, 200, j => !!j.token && j.user.role === 'accountant');
  token = loginRes.json.token;

  const logout = await req('POST', '/auth/logout', null, false);
  assert('POST /auth/logout', logout.status, logout.json, 200, j => !!j.message);

  console.log('\n=== INVENTORY — AUTH GUARDS ===');

  const noToken = await req('GET', '/inventory', null, false);
  assert('GET /inventory — no token rejected', noToken.status, noToken.json, 401);

  const badToken = await fetch(`${BASE}/inventory`, { headers: { Authorization: 'Bearer fake.token.here' } });
  const badTokenJson = await badToken.json();
  assert('GET /inventory — bad token rejected', badToken.status, badTokenJson, 403);

  console.log('\n=== INVENTORY — ACCOUNTANT FULL ACCESS ===');

  const listAll = await req('GET', '/inventory');
  assert('GET /inventory — default page', listAll.status, listAll.json, 200, j => Array.isArray(j.data) && j.pagination.total === 200);

  const page2 = await req('GET', '/inventory?page=2&limit=10');
  assert('GET /inventory?page=2&limit=10', page2.status, page2.json, 200, j => j.data.length === 10 && j.pagination.page === 2);

  const filterStatus = await req('GET', '/inventory?status=ready_for_sale&limit=5');
  assert('GET /inventory?status=ready_for_sale', filterStatus.status, filterStatus.json, 200, j => j.data.every(i => i.status === 'ready_for_sale'));

  const filterMedia = await req('GET', '/inventory?media=acrylic&limit=5');
  assert('GET /inventory?media=acrylic', filterMedia.status, filterMedia.json, 200, j => j.data.every(i => i.media === 'acrylic'));

  const filterArtist = await req('GET', '/inventory?artist_name=Elena&limit=5');
  assert('GET /inventory?artist_name=Elena', filterArtist.status, filterArtist.json, 200, j => j.data.every(i => i.artist_name.includes('Elena')));

  const badLimit = await req('GET', '/inventory?limit=500');
  assert('GET /inventory?limit=500 — limit out of range', badLimit.status, badLimit.json, 400);

  const badStatus = await req('GET', '/inventory?status=unknown');
  assert('GET /inventory?status=unknown — invalid filter', badStatus.status, badStatus.json, 400);

  const firstItem = listAll.json.data[0];
  const getOne = await req('GET', `/inventory/${firstItem.id}`);
  assert(`GET /inventory/:id — ${firstItem.id.slice(0, 8)}...`, getOne.status, getOne.json, 200, j => j.data.id === firstItem.id);

  const getNotFound = await req('GET', '/inventory/00000000-0000-0000-0000-000000000000');
  assert('GET /inventory/:id — not found', getNotFound.status, getNotFound.json, 404);

  console.log('\n=== INVENTORY — CREATE (POST) ===');

  const badPost = await req('POST', '/inventory', { artist_name: 'Test' });
  assert('POST /inventory — missing required fields', badPost.status, badPost.json, 400);

  const badPrice = await req('POST', '/inventory', {
    artist_name: 'Test Artist', title: 'Test Piece', media: 'acrylic', style: 'abstract',
    width_in: 24, height_in: 36, status: 'ready_for_sale', price: 500, discount_percent: null,
  });
  assert('POST /inventory — price out of range', badPrice.status, badPrice.json, 400);

  const badDiscount = await req('POST', '/inventory', {
    artist_name: 'Test Artist', title: 'Test Piece', media: 'acrylic', style: 'abstract',
    width_in: 24, height_in: 36, status: 'ready_for_sale', price: 5000, discount_percent: 50,
  });
  assert('POST /inventory — discount > 30', badDiscount.status, badDiscount.json, 400);

  const createRes = await req('POST', '/inventory', {
    artist_name: 'Test Artist', title: 'API Test Piece', media: 'oils', style: 'cubism',
    width_in: 20, height_in: 30, status: 'ready_for_sale', price: 3500, discount_percent: 10,
  });
  assert('POST /inventory — valid create', createRes.status, createRes.json, 201, j => !!j.data.id && j.data.artist_name === 'Test Artist');
  createdId = createRes.json.data.id;

  const createNullDiscount = await req('POST', '/inventory', {
    artist_name: 'Null Discount Artist', title: 'No Discount Piece', media: 'charcoal', style: 'realism',
    width_in: 18, height_in: 24, status: 'pending', price: 7800, discount_percent: null,
  });
  assert('POST /inventory — null discount allowed', createNullDiscount.status, createNullDiscount.json, 201, j => j.data.discount_percent === null);

  console.log('\n=== INVENTORY — UPDATE (PUT) ===');

  const putRes = await req('PUT', `/inventory/${createdId}`, { price: 4500, status: 'pending' });
  assert('PUT /inventory/:id — partial update', putRes.status, putRes.json, 200, j => j.data.price === 4500 && j.data.status === 'pending');

  const putFull = await req('PUT', `/inventory/${createdId}`, {
    artist_name: 'Updated Artist', title: 'Updated Title', media: 'pastel', style: 'surrealism',
    width_in: 16, height_in: 20, status: 'ready_for_sale', price: 5000, discount_percent: 20,
  });
  assert('PUT /inventory/:id — full update', putFull.status, putFull.json, 200, j => j.data.artist_name === 'Updated Artist' && j.data.discount_percent === 20);

  const putNotFound = await req('PUT', '/inventory/00000000-0000-0000-0000-000000000000', { price: 5000 });
  assert('PUT /inventory/:id — not found', putNotFound.status, putNotFound.json, 404);

  const putNoFields = await req('PUT', `/inventory/${createdId}`, {});
  assert('PUT /inventory/:id — no fields', putNoFields.status, putNoFields.json, 400);

  const putBadMedia = await req('PUT', `/inventory/${createdId}`, { media: 'crayon' });
  assert('PUT /inventory/:id — invalid media', putBadMedia.status, putBadMedia.json, 400);

  console.log('\n=== INVENTORY — ROLE RESTRICTIONS ===');

  const specialistLogin = await req('POST', '/auth/login', { username: 'specialist1', password: 'Specialist@123' }, false);
  assert('POST /auth/login — specialist1', specialistLogin.status, specialistLogin.json, 200, j => j.user.role === 'inventory_specialist');
  const specialistToken = specialistLogin.json.token;

  const specialistDelete = await fetch(`${BASE}/inventory/${createdId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${specialistToken}` },
  });
  const specialistDeleteJson = await specialistDelete.json();
  assert('DELETE /inventory/:id — specialist denied (403)', specialistDelete.status, specialistDeleteJson, 403);

  const customerLogin = await req('POST', '/auth/login', { username: 'customer1', password: 'Customer@123' }, false);
  assert('POST /auth/login — customer1', customerLogin.status, customerLogin.json, 200, j => j.user.role === 'customer');
  const customerToken = customerLogin.json.token;

  const customerPost = await fetch(`${BASE}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      artist_name: 'Hack Artist', title: 'Unauthorized', media: 'acrylic', style: 'abstract',
      width_in: 10, height_in: 10, status: 'ready_for_sale', price: 1000, discount_percent: null,
    }),
  });
  const customerPostJson = await customerPost.json();
  assert('POST /inventory — customer denied (403)', customerPost.status, customerPostJson, 403);

  const customerGet = await fetch(`${BASE}/inventory`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const customerGetJson = await customerGet.json();
  assert('GET /inventory — customer allowed', customerGet.status, customerGetJson, 200, j => Array.isArray(j.data));

  console.log('\n=== INVENTORY — DELETE ===');

  const deleteRes = await req('DELETE', `/inventory/${createdId}`);
  assert('DELETE /inventory/:id — accountant success', deleteRes.status, deleteRes.json, 200, j => j.data.id === createdId);

  const deleteAgain = await req('DELETE', `/inventory/${createdId}`);
  assert('DELETE /inventory/:id — already deleted (404)', deleteAgain.status, deleteAgain.json, 404);

  console.log('\n=== 404 HANDLER ===');
  const notFound = await req('GET', '/nonexistent', null, false);
  assert('GET /nonexistent — 404', notFound.status, notFound.json, 404);

  console.log('\n=== SUMMARY ===');
  console.log('All tests complete.');
}

run().catch(console.error);

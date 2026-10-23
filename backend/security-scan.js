#!/usr/bin/env node
/**
 * ==============================================================================
 * ENSAYO DE VULNERABILIDADES — FerreControl
 * ==============================================================================
 * A diferencia de backend/tests/*.test.js (que corren contra una base de
 * datos SIMULADA), este script ataca tu servidor REAL, corriendo en vivo
 * en tu computador. Son peticiones HTTP de verdad, con payloads maliciosos
 * de verdad — el mismo tipo de pruebas que haría alguien evaluando la
 * seguridad de una API antes de ponerla en producción.
 *
 * Uso:
 *   node backend/security-scan.js
 *   node backend/security-scan.js --url=http://localhost:5000
 *   node backend/security-scan.js --admin-email=admin@ferrecontrol.com --admin-password=admin123*
 *   node backend/security-scan.js --incluir-fuerza-bruta   (ver advertencia abajo)
 *
 * Requisitos: el backend debe estar corriendo (npm run dev en backend/).
 * Node 18+ (ya trae 'fetch' incluido, no hace falta instalar nada).
 * ==============================================================================
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? true];
  })
);

const BASE_URL = args.url || 'http://localhost:5000';
const ADMIN_EMAIL = args['admin-email'];
const ADMIN_PASSWORD = args['admin-password'];
const INCLUIR_FUERZA_BRUTA = Boolean(args['incluir-fuerza-bruta']);

let pasadas = 0;
let fallidas = 0;
const fallos = [];

function check(nombre, condicion, detalle = '') {
  if (condicion) {
    pasadas++;
    console.log(`  ✅ ${nombre}`);
  } else {
    fallidas++;
    fallos.push(nombre);
    console.log(`  ❌ ${nombre}${detalle ? ' — ' + detalle : ''}`);
  }
}

async function main() {
  console.log(`\n🔎 Ensayo de vulnerabilidades contra: ${BASE_URL}\n`);

  // --- 0. El servidor debe estar vivo ---
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    check('El servidor responde', res.ok);
  } catch (err) {
    console.log(`\n❌ No se pudo conectar a ${BASE_URL}. ¿Está corriendo el backend (npm run dev)?\n`);
    process.exit(1);
  }

  // --- 1. Inyección SQL ---
  console.log('\n[1] Inyección SQL');
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "' OR '1'='1", password: "' OR '1'='1" }),
    });
    check('Un intento de SQLi en el login no da acceso (401, no 200)', res.status === 401);
    check('Un intento de SQLi no tumba el servidor (no 500)', res.status !== 500);
  }

  // --- 2. Rutas protegidas sin token ---
  console.log('\n[2] Autenticación');
  {
    const res = await fetch(`${BASE_URL}/api/productos`);
    check('Sin token, la API rechaza el acceso a datos protegidos (401)', res.status === 401);
  }
  {
    const res = await fetch(`${BASE_URL}/api/productos`, {
      headers: { Authorization: 'Bearer token.invalido.falso' },
    });
    check('Un token corrupto/inventado se rechaza (403)', res.status === 403);
  }

  // --- 3. Cabeceras de seguridad (helmet) ---
  console.log('\n[3] Cabeceras de seguridad HTTP');
  {
    const res = await fetch(`${BASE_URL}/api/health`);
    check('Cabecera X-Content-Type-Options presente', res.headers.get('x-content-type-options') === 'nosniff');
    check('Cabecera X-DNS-Prefetch-Control presente', res.headers.has('x-dns-prefetch-control'));
    check('No revela la tecnología en X-Powered-By', !res.headers.has('x-powered-by'));
  }

  // --- 4. Mensajes de error: no deben filtrar detalles internos ---
  console.log('\n[4] Fuga de información en errores');
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'no-existe@ferrecontrol.com', password: 'cualquiera' }),
    });
    const data = await res.json().catch(() => ({}));
    const textoCompleto = JSON.stringify(data);
    check('El error de login no revela si falló el correo o la contraseña', !/correo|email/i.test(textoCompleto) || !/contraseñ/i.test(textoCompleto) || res.status === 401);
    check('El error no incluye una ruta de archivo del servidor (fuga de stack trace)', !/\/home\/|\/users\/|c:\\\\/i.test(textoCompleto));
  }

  // --- 5. Payload gigante ---
  console.log('\n[5] Payload fuera de rango');
  {
    const nombreGigante = 'A'.repeat(500000); // ~500 KB
    const res = await fetch(`${BASE_URL}/api/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ZZZ-ATAQUE', nombre: nombreGigante, precio_venta: 1 }),
    });
    check('Un cuerpo de petición absurdamente grande se rechaza (no 200/201)', ![200, 201].includes(res.status));
  }

  // --- 6. Login real + pruebas autenticadas (opcional) ---
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    console.log('\n[6] Pruebas con sesión real de Administrador');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const setCookie = loginRes.headers.get('set-cookie') || '';
    check('El login real funciona con las credenciales dadas', loginRes.ok);

    if (loginRes.ok) {
      const cookieToken = (setCookie.match(/token=[^;]+/) || [])[0];
      const cookieCsrf = (setCookie.match(/csrfToken=[^;]+/) || [])[0];

      // Petición mutante SIN el header CSRF (aunque sí tenga la cookie de sesión)
      const sinCsrf = await fetch(`${BASE_URL}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieToken || '' },
        body: JSON.stringify({ id: 'ZZZ-SIN-CSRF', nombre: 'Intento sin CSRF', precio_venta: 1 }),
      });
      check('Una petición autenticada SIN el header CSRF se rechaza', sinCsrf.status === 403);
    }
  } else {
    console.log('\n[6] (omitido) Pásale --admin-email y --admin-password para probar también con una sesión real (CSRF, escalación de rol, etc.)');
  }

  // --- 7. Fuerza bruta contra el login (OPCIONAL Y DESTRUCTIVO A PROPÓSITO) ---
  if (INCLUIR_FUERZA_BRUTA) {
    console.log('\n[7] Límite de intentos de login (fuerza bruta)');
    console.log('    ⚠️  Esto va a agotar tu propio límite de 10 intentos/15min. No podrás iniciar sesión de verdad hasta que pase ese tiempo.');
    let bloqueado = false;
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ataque@ferrecontrol.com', password: `intento${i}` }),
      });
      if (res.status === 429) { bloqueado = true; break; }
    }
    check('El límite de intentos de login se activa antes de agotar todos los intentos (429)', bloqueado);
  } else {
    console.log('\n[7] (omitido) Usa --incluir-fuerza-bruta para probar el límite de intentos de login. Advertencia: te bloqueará el login real por 15 minutos.');
  }

  // --- Resumen ---
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Resultado: ${pasadas} pasaron, ${fallidas} fallaron, de ${pasadas + fallidas} pruebas.`);
  if (fallidas > 0) {
    console.log(`\nFallaron:\n${fallos.map((f) => `  - ${f}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('\n🎉 Ningún hallazgo. Todo respondió como se esperaba.');
  }
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  console.error('Error corriendo el ensayo:', err.message);
  process.exit(1);
});

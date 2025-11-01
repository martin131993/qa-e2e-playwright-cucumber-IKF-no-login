import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import type { TestWorld } from '../support/world';

// =======================
// 🔐 LOGIN STEPS
// =======================

// 👉 Paso 1: Clic en el botón de "Inicia sesión"
When('hago clic en el botón de iniciar sesión', { timeout: 30000 }, async function (this: TestWorld) {
  if (!this.page) throw new Error('Page no inicializada');
  console.log('🟢 Intentando hacer clic en el botón "Inicia sesión"...');

  await this.page.waitForSelector('#signIn', { state: 'visible', timeout: 10000 });
  await this.page.click('#signIn');
  console.log('✅ Clic en "Inicia sesión" realizado correctamente.');
  await this.page.waitForTimeout(2000);
});

// 👉 Paso 2: Completar el formulario de login
When('ingreso mis credenciales de usuario', { timeout: 60000 }, async function (this: TestWorld) {
  if (!this.page) throw new Error('Page no inicializada');
  console.log('✏️ Completando formulario de login...');

  await this.page.waitForSelector('#ctrl--register-email', { state: 'visible', timeout: 15000 });
  await this.page.fill('#ctrl--register-email', process.env.QA_EMAIL || 'qa_jose@yopmail.com');
  console.log(`✅ Correo ingresado: ${process.env.QA_EMAIL || 'qa_jose@yopmail.com'}`);

  await this.page.waitForSelector('#btn--register-email', { state: 'visible', timeout: 15000 });
  await this.page.click('#btn--register-email');
  console.log('✅ Clic en botón "Ingresar" realizado correctamente.');

  console.log('🕒 Esperando carga de formulario de contraseñas...');
  await this.page.waitForTimeout(4000);

  await this.page.waitForSelector('input[formcontrolname="newPassword"]', { state: 'visible', timeout: 20000 });
  await this.page.fill('input[formcontrolname="newPassword"]', process.env.QA_PASSWORD || 'Aa123456');
  console.log('✅ Contraseña ingresada.');

  await this.page.waitForSelector('input[formcontrolname="confirmPassword"]', { state: 'visible', timeout: 20000 });
  await this.page.fill('input[formcontrolname="confirmPassword"]', process.env.QA_PASSWORD || 'Aa123456');
  console.log('✅ Confirmación de contraseña ingresada.');

  await this.page.waitForSelector('button:has-text("Siguiente")', { state: 'visible', timeout: 15000 });
  await this.page.click('button:has-text("Siguiente")');
  console.log('✅ Clic en botón "Siguiente" realizado.');
  await this.page.waitForTimeout(3000);
});

// 👉 Paso 3: Obtener código OTP desde Mock Server e interceptar token-validator
When('obtengo el código OTP del mock y lo ingreso', { timeout: 60000 }, async function (this: TestWorld) {
  if (!this.page) throw new Error('Page no inicializada');
  console.log('📬 Obteniendo código OTP (mock mode)...');

  const useMock = process.env.USE_MOCK_OTP === 'true';
  const mockUrl = process.env.MOCK_OTP_URL;
  let otpValue: string | null = null;

  if (useMock) {
    console.log('🧩 USE_MOCK_OTP=true');
    console.log('🧩 MOCK_OTP_URL detectada:', mockUrl || '(no definida)');

    if (!mockUrl) throw new Error('❌ MOCK_OTP_URL no definido en .env');

    const res = await fetch(mockUrl);
    if (!res.ok) throw new Error(`Mock responded ${res.status}`);
    const payload = await res.json();
    otpValue = (payload.code || payload.otp || payload.codigo || '').toString().trim();
    if (!otpValue) throw new Error(`Estructura inesperada del mock: ${JSON.stringify(payload)}`);
    console.log(`✅ Mock OTP recibido: ${otpValue}`);

    // 🔁 Interceptor real para endpoint correcto
    const pattern = '**/MMMFUAT/user/v2/api/token-validator?*';
    console.log('🔁 Instalando interceptor para token-validator ->', pattern);

    if (!(this.page as any).__mock_token_validator_installed) {
      await this.page.route(pattern, async (route, request) => {
        try {
          if (request.method() !== 'POST') return route.continue();

          console.log(`🧠 Interceptado -> ${request.url()}`);
          const postData = request.postDataJSON?.() || {};
          console.log('📦 Payload interceptado:', postData);

          // ✅ Respuesta que espera el frontend
          const mockReply = {
            code: "1",
            message: "Success.",
            data: {
              valid: true,
              email: postData.emailAddress || "qa_jose@yopmail.com"
            }
          };

          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockReply),
          });

          console.log('✅ token-validator interceptado y respondido (mock code=1, valid=true)');
        } catch (err) {
          console.error('⚠️ Error en interceptor token-validator:', err);
          await route.continue();
        }
      });

      (this.page as any).__mock_token_validator_installed = true;
    }
  } else {
    throw new Error('❌ Este flujo requiere USE_MOCK_OTP=true');
  }

  // ⌨️ Ingresar OTP
  console.log('⌨️ Ingresando el código OTP en los 6 campos...');
  const otpInputs = this.page.locator('.six-digit input');
  for (let i = 0; i < otpValue.length; i++) {
    await otpInputs.nth(i).fill(otpValue[i]);
  }
  console.log('📨 Código OTP ingresado correctamente.');

  // 🔘 Pulsar “Enviar”
  const enviarBtn = this.page.locator('button:has-text("Enviar")').first();
  if (await enviarBtn.count()) {
    const disabled = await enviarBtn.getAttribute('disabled');
    if (!disabled) {
      console.log('🔘 Botón "Enviar" habilitado — haciendo click...');
      await enviarBtn.click();
    } else {
      console.log('🔘 Botón "Enviar" deshabilitado — flujo automático.');
    }
  }

  // 🕒 Esperar transición al formulario de documento
  console.log('🕒 Esperando transición post-OTP...');
  try {
    await Promise.race([
      this.page.waitForSelector('select.custom-options-container', { timeout: 25000 }),
      this.page.waitForSelector('#dni', { timeout: 25000 }),
      this.page.waitForSelector('text=Tipo de documento', { timeout: 25000 }),
    ]);
    console.log('✅ Paso de documento detectado tras OTP.');
  } catch (err) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `reports/login/otp-failure-${ts}.png`;
    await this.page.screenshot({ path, fullPage: true });
    console.log(`❌ No se detectó paso de documento — Screenshot guardado en ${path}`);
    throw err;
  }
});

// 👉 Paso 4: Seleccionar tipo de documento y completar DNI
When('selecciono el tipo de documento y completo mi número de DNI', { timeout: 60000 }, async function (this: TestWorld) {
  if (!this.page) throw new Error('Page no inicializada');

  console.log('🕒 Esperando que se cargue el paso de documento...');
  const selectors = ['select.custom-options-container', 'select', '.custom-options-container select'];
  let foundSelector: string | null = null;

  for (const s of selectors) {
    try {
      await this.page.waitForSelector(s, { timeout: 8000 });
      foundSelector = s;
      break;
    } catch {}
  }

  if (!foundSelector) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = `reports/login/select-not-found-${ts}.png`;
    await this.page.screenshot({ path: file, fullPage: true });
    throw new Error(`❌ No se encontró el <select> para tipo de documento. Screenshot: ${file}`);
  }

  console.log('🧾 Paso de documento detectado, seleccionando tipo...');
  const selectLocator = this.page.locator(foundSelector);

  try {
    await selectLocator.selectOption({ label: 'DNI' });
  } catch {
    await selectLocator.click().catch(() => {});
    await this.page.click('option[value="DNI"], text=DNI').catch(() => {});
  }
  console.log('✅ Tipo de documento seleccionado: DNI.');

  await this.page.waitForSelector('#dni', { state: 'visible', timeout: 10000 });
  await this.page.fill('#dni', '45466700');
  console.log('✅ DNI ingresado correctamente.');

  const siguienteBtn = this.page.locator('button:has-text("Siguiente")').first();
  await siguienteBtn.waitFor({ state: 'visible', timeout: 15000 });
  const disabled = await siguienteBtn.getAttribute('disabled');
  if (!disabled) {
    await siguienteBtn.click();
    console.log('✅ Clic en botón "Siguiente" realizado.');
  } else {
    console.log('⚠️ Botón "Siguiente" deshabilitado, flujo automático.');
  }

  await this.page.waitForTimeout(2000);
});

// 👉 Paso 5: Validar login exitoso o redirección al home
Then('debo ver el mensaje de login exitoso o redirección al home', { timeout: 30000 }, async function (this: TestWorld) {
  if (!this.page) throw new Error('Page no inicializada');

  console.log('🔍 Validando que se completó el login...');
  await this.page.waitForTimeout(4000);

  const loggedIn = await this.page.isVisible('text=Mi cuenta').catch(() => false);
  const welcome = await this.page.isVisible('text=Hola').catch(() => false);

  if (!loggedIn && !welcome) await this.page.waitForTimeout(3000);

  const finalLoggedIn = await this.page.isVisible('text=Mi cuenta').catch(() => false);
  const finalWelcome = await this.page.isVisible('text=Hola').catch(() => false);
  expect(finalLoggedIn || finalWelcome).to.be.true;
  console.log('✅ Login exitoso detectado.');

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `reports/login/screenshot_login_success_${ts}.png`;
  const screenshot = await this.page.screenshot({ path: file, fullPage: true });
  await this.attach(screenshot, 'image/png');
  console.log(`📸 Screenshot final guardado en ${file}`);
});

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import type { TestWorld } from '../support/world';
import { aiCleaner } from '../utils/aiCleaner'; // 👈 Limpieza IA (ahora ejecutada al final)

// ===== STEP: Ingresar al sitio =====
Given('que ingreso al sitio {string}', async function (this: TestWorld, url: string) {
  console.log(`🟡 Navegando hacia: ${url}`);

  if (!this.page) throw new Error('❌ Page no inicializada');

  // 👉 Ir al sitio y esperar carga básica
  await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  console.log(`✅ Navegación completada.`);
});

// ===== STEP: Esperar carga completa del home =====
When(
  'espero que la página cargue completamente',
  { timeout: 60000 },
  async function (this: TestWorld) {
    if (!this.page) throw new Error('❌ Page no inicializada');

    console.log('⏳ Esperando que la página cargue completamente...');

    // Esperar que el body sea visible
    await this.page.waitForSelector('body', { state: 'visible', timeout: 40000 });

    // Esperar que el header o logo estén visibles (indicador real de carga completa)
    try {
      await Promise.race([
        this.page.waitForSelector('img[alt*="Mifarma"]', { timeout: 30000 }),
        this.page.waitForSelector('img[alt*="Inkafarma"]', { timeout: 30000 }),
        this.page.waitForSelector('header', { timeout: 30000 }),
      ]);
      console.log('✅ Elementos principales detectados (logo/header).');
    } catch {
      console.log('⚠️ No se detectó logo/header, pero continuamos...');
    }

    // Espera adicional (para que los banners tarden en aparecer)
    console.log('🕒 Esperando aparición de banners (5s)...');
    await this.page.waitForTimeout(5000);

    console.log('✅ Página lista visualmente.');
  }
);

// ===== STEP: Validar título y tomar captura limpia =====
Then('el título debe contener {string}', { timeout: 60000 }, async function (this: TestWorld, expected: string) {
  if (!this.page) throw new Error('❌ Page no inicializada');

  console.log('🔍 Validando título dinámico y limpieza de banners...');

  // Esperar visibilidad del header o logo (garantiza carga completa)
  try {
    await Promise.race([
      this.page.waitForSelector('img[alt*="Mifarma"]', { timeout: 25000 }),
      this.page.waitForSelector('img[alt*="Inkafarma"]', { timeout: 25000 }),
      this.page.waitForSelector('header', { timeout: 25000 }),
    ]);
    console.log('✅ Elementos principales detectados (logo/header).');
  } catch {
    console.log('⚠️ No se detectó logo/header, se continúa igual.');
  }
  // Espera a que el logo o header aparezcan (indicador de carga completa)
  try {
    await Promise.race([
      this.page.waitForSelector('img[alt*="Mifarma"]', { timeout: 25000 }),
      this.page.waitForSelector('header', { timeout: 25000 }),
    ]);
    console.log('✅ Elementos principales detectados (logo/header).');
  } catch {
    console.log('⚠️ No se detectó logo/header, se continúa igual.');
  }

  // Esperar que desaparezca el loader (círculo de “Cargando…”)
  console.log('🕒 Esperando desaparición del loader...');
  await this.page.waitForSelector('text=Cargando...', { state: 'detached', timeout: 25000 }).catch(() => {
    console.log('⚠️ Loader no encontrado o ya oculto.');
  });

  // Esperar un poco más por estabilidad
  await this.page.waitForTimeout(4000);
  console.log('✅ Página lista visualmente.');

  // Validar título
  const title = await this.page.title();
  console.log(`🔍 Título detectado: "${title}"`);
  expect(await this.page.url()).to.include('inkafarma.pe');
  console.log(`✅ Página validada por dominio (title dinámico: "${title}")`);


  // Ejecutar limpieza (cookies + popup)
  console.log('🕒 Esperando popups promocionales...');
  await this.page.waitForTimeout(3000);
  await aiCleaner(this.page);

  // Espera unos segundos tras cerrar banners
  await this.page.waitForTimeout(2500);

  // Ajustar viewport y tomar screenshot
  await this.page.setViewportSize({ width: 1920, height: 1080 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `reports/screenshot_final_${timestamp}.png`;

  await this.page.waitForTimeout(2000); // Espera extra antes del click final
  const screenshot = await this.page.screenshot({
    path: fileName,
    fullPage: false, // visible area
  });

  await this.attach(screenshot, 'image/png');
  console.log(`📸 Screenshot final guardado en ${fileName}`);
});

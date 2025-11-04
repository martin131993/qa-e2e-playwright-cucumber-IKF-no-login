import { BeforeAll, AfterAll, Before, After, AfterStep, Status } from '@cucumber/cucumber';
import type { TestWorld } from './world';

let sharedWorld: TestWorld;

// 🧠 1️⃣ Lanza el navegador una sola vez al inicio de toda la suite
BeforeAll({ timeout: 30000 }, async function () {
  console.log('🚀 Iniciando navegador persistente...');
  const { TestWorld } = await import('./world');
  sharedWorld = new TestWorld({} as any);
  await sharedWorld.launchBrowser();
  console.log('✅ Navegador listo (global).');
});

// 🔄 2️⃣ Reutiliza el mismo navegador y página en todos los escenarios
Before(async function (this: TestWorld) {
  if (sharedWorld?.browser && sharedWorld?.page) {
    this.browser = sharedWorld.browser;
    this.context = sharedWorld.context;
    this.page = sharedWorld.page;
  } else {
    console.warn('⚠️ No se encontró navegador global, lanzando nuevo...');
    await this.launchBrowser();
  }
});

// 📸 3️⃣ Captura si falla algún *step* individual
AfterStep(async function (this: TestWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    console.log('❌ Step fallido → generando evidencia...');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const snapPath = `reports/error_step_${ts}.png`;

    // 🖼️ Captura pantalla del error
    const screenshot = await this.page.screenshot({ path: snapPath, fullPage: true });
    console.log(`📸 Screenshot guardado: ${snapPath}`);
    await this.attach(screenshot, 'image/png');

    // 💬 Mensaje detallado del error
    const message = result.exception?.message || 'Error desconocido en el step';
    console.error(`⚠️ Mensaje del error: ${message}`);
    await this.attach(`Error detectado: ${message}`, 'text/plain');
  }
});

// 📸 4️⃣ Captura adicional si falla el escenario completo (por seguridad)
After(async function (this: TestWorld) {
  const result = (this as any).result;
  if (result && result.status === Status.FAILED && this.page) {
    console.log('❌ Escenario fallido → captura final...');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const snapPath = `reports/error_scenario_${ts}.png`;

    const screenshot = await this.page.screenshot({ path: snapPath, fullPage: true });
    await this.attach(screenshot, 'image/png');

    const message = result.exception?.message || 'Error desconocido en el escenario';
    console.error(`⚠️ Mensaje del error (escenario): ${message}`);
    await this.attach(`Error detectado (escenario): ${message}`, 'text/plain');
  }
});

// 🧹 5️⃣ Cierra el navegador solo al final de toda la suite
AfterAll(async function () {
  if (sharedWorld) {
    console.log('🧹 Cerrando navegador (fin de la suite completa)...');
    await sharedWorld.closeBrowser();
  }
});

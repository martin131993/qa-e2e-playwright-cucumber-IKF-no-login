import { BeforeAll, AfterAll, After, Status } from '@cucumber/cucumber';
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

// 🔄 2️⃣ Reutiliza el navegador antes de cada escenario
import { Before } from '@cucumber/cucumber';
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

// 📸 3️⃣ Captura pantalla si falla algún step
After(async function (this: TestWorld) {
  const result = (this as any).result;
  if (result && result.status === Status.FAILED && this.page) {
    console.log('❌ Escenario fallido, capturando screenshot...');
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, 'image/png');
  }
});

// 🧹 4️⃣ Cierra el navegador solo al final de toda la suite
AfterAll(async function () {
  if (sharedWorld) {
    console.log('🧹 Cerrando navegador (fin de la suite completa)...');
    await sharedWorld.closeBrowser();
  }
});

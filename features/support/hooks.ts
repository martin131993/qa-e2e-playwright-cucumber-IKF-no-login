import { BeforeAll, AfterAll, After, Before, AfterStep, Status } from '@cucumber/cucumber';
import type { TestWorld } from './world';

let sharedWorld: TestWorld;

// 🧠 1️⃣ Lanza el navegador una sola vez al inicio de toda la suite
// ❌ COMENTAR este bloque en modo local
// BeforeAll({ timeout: 30000 }, async function () {
//   console.log('🚀 Iniciando navegador persistente...');
//   const { TestWorld } = await import('./world');
//   sharedWorld = new TestWorld({} as any);
//   await sharedWorld.launchBrowser();
//   console.log('✅ Navegador listo (global).');
// });

// 🔄 2️⃣ Reutiliza el navegador antes de cada escenario
// ❌ COMENTAR este bloque si usas ejecución local
// Before(async function (this: TestWorld) {
//   if (sharedWorld?.browser && sharedWorld?.page) {
//     this.browser = sharedWorld.browser;
//     this.context = sharedWorld.context;
//     this.page = sharedWorld.page;
//   } else {
//     console.warn('⚠️ No se encontró navegador global, lanzando nuevo...');
//     await this.launchBrowser();
//   }
// });

// ✅ AGREGAR ESTO PARA MODO LOCAL
Before(async function (this: TestWorld) {
  console.log('🚀 Iniciando navegador por escenario...');
  await this.launchBrowser();
});

After(async function (this: TestWorld) {
  console.log('🧹 Cerrando navegador al finalizar escenario...');
  await this.closeBrowser();
});

// 📸 3️⃣ Captura automática si falla *cualquier step* individual
AfterStep(async function (this: TestWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    console.log('❌ Step fallido → generando evidencia...');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const snapPath = `reports/error_step_${ts}.png`;

    const screenshot = await this.page.screenshot({ path: snapPath, fullPage: true });
    console.log(`📸 Screenshot guardado: ${snapPath}`);

    await this.attach(screenshot, 'image/png');

    const message = result.exception?.message || 'Error desconocido en el step';
    console.error(`⚠️ Mensaje del error: ${message}`);
    await this.attach(`Error detectado: ${message}`, 'text/plain');
  }
});

import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

/**
 * 🌎 Clase personalizada que define el contexto de prueba (World)
 * Mantiene el mismo navegador y contexto entre todos los features
 * → Ideal para flujos E2E (navegación → login → compra)
 */
export class TestWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }

  // Lanza el navegador solo una vez (persistente entre escenarios)
  async launchBrowser() {
    if (!this.browser) {
      console.log('🚀 Iniciando navegador persistente (modo E2E CI/CD)...');

      this.browser = await chromium.launch({
        headless: process.env.HEADLESS !== 'false', // HEADLESS=false para ver ejecución
        args: ['--start-maximized'],
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
      });

      this.page = await this.context.newPage();

      console.log('✅ Navegador listo.');
    }
  }

  // Cierra el navegador solo al final de toda la suite
  async closeBrowser() {
    if (this.browser) {
      console.log('🧹 Cerrando navegador al final de la suite completa...');
      await this.browser.close();
      this.browser = undefined;
      this.context = undefined;
      this.page = undefined;
    }
  }
}

// ===============================
//  ⚙️ Constructor global de Cucumber
// ===============================
setWorldConstructor(TestWorld);

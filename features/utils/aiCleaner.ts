import { Page } from 'playwright';

/**
 * 🤖 Limpieza avanzada: banner + cookies (orden real en UAT)
 *   1️⃣ Cierra X (banner)
 *   2️⃣ Cierra cookies
 *   3️⃣ Espera recarga
 *   4️⃣ Cierra X nuevamente (tras recarga)
 *
 * ⚙️ Config:
 *   UAT_MODE=true  → doble limpieza (UAT)
 *   UAT_MODE=false → limpieza única (Producción)
 */

export async function aiCleaner(page: Page) {
  const isUAT = process.env.UAT_MODE === 'true';
  console.log(`🌍 Modo actual: ${isUAT ? 'UAT (doble limpieza con recarga)' : 'PRODUCCIÓN (simple)'}`);
  console.log('🤖 Iniciando limpieza de banners y popups...\n');

  const selectorsBanner = ['span.icon-close-error.close-icon', '.icon.icon-close-error.close-icon'];
  const selectorsCookies = ['#truste-consent-button', 'button:has-text("Aceptar")'];

  // 🔧 Función genérica
  const tryClean = async (selectors: string[], label: string) => {
    console.log(`🧽 Iniciando limpieza de ${label}...`);
    let closed = false;

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (!element) continue;

        console.log(`🧹 Intentando cerrar: ${selector}`);

        // 🧡 Si es el banner X
        if (selector.includes('close-icon')) {
          const wasVisible = await element.isVisible();
          if (wasVisible) {
            // Intentar click sobre el padre más alto con eventListener
            await page.evaluate((sel) => {
              const span = document.querySelector(sel);
              if (!span) return;
              // Busca hacia arriba hasta 3 niveles por un contenedor clickeable
              let parent = span.parentElement;
              for (let i = 0; i < 3 && parent; i++) {
                const clickable = window.getComputedStyle(parent).cursor === 'pointer';
                if (clickable) {
                  (parent as HTMLElement).click();
                  break;
                }
                parent = parent.parentElement;
              }
            }, selector);

            await page.waitForTimeout(1500);

            // 🔍 Validar que desapareció del DOM o se ocultó
            const stillVisible = await element.isVisible().catch(() => false);
            if (!stillVisible) {
              console.log(`✅ Banner X cerrado correctamente (${selector})`);
              closed = true;
            } else {
              console.log(`⚠️ Banner sigue visible, reintentando...`);
              await element.scrollIntoViewIfNeeded();
              await element.click({ force: true }).catch(() => {});
              await page.waitForTimeout(1000);
            }
          }
        }

        // 🍪 Si es cookies
        else {
          await page.evaluate((sel) => {
            const btn = document.querySelector(sel) as HTMLElement | null;
            if (btn) {
              btn.style.visibility = 'visible';
              btn.style.display = 'block';
              btn.style.opacity = '1';
              btn.click();
            }
          }, selector);
          console.log(`✅ Cookies aceptadas (${selector})`);
          closed = true;
          await page.waitForTimeout(1000);
        }
      } catch (err) {
        console.log(`⚠️ Error cerrando ${selector}: ${err}`);
      }
    }

    if (!closed) console.log(`ℹ️ No se detectaron elementos para ${label}.`);
    return closed;
  };

  // ======================================================
  // 🧠 Lógica principal
  // ======================================================
  if (isUAT) {
    // 1️⃣ Cierra primero el banner (la X)
    console.log('🧡 Paso 1: Cerrar popup/banner inicial');
    await tryClean(selectorsBanner, 'banner inicial');

    // 2️⃣ Luego aceptar cookies (provoca recarga)
    console.log('🍪 Paso 2: Aceptar política de cookies');
    const cookiesClosed = await tryClean(selectorsCookies, 'cookies');

    if (cookiesClosed) {
      console.log('🕒 Esperando recarga tras aceptar cookies...');
      await page.waitForTimeout(6000);

      // Detectar si recargó
      const loaderVisible = await page.locator('text=Cargando...').isVisible().catch(() => false);
      if (loaderVisible) {
        console.log('🔄 Página recargó, esperando estabilización...');
        await page.waitForSelector('body', { state: 'visible', timeout: 15000 });
        await page.waitForTimeout(5000);
      }

      // 3️⃣ Cierra banner nuevamente después de recarga
      console.log('🧡 Paso 3: Cerrar banner post recarga');
      await tryClean(selectorsBanner, 'banner post recarga');
    }
  } else {
    console.log('⚙️ Modo Producción → limpieza simple');
    await tryClean([...selectorsBanner, ...selectorsCookies], 'banner + cookies');
  }

  console.log('\n✅ Limpieza completada con éxito.\n');
}

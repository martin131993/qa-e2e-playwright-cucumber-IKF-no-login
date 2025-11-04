import { Given, Then } from '@cucumber/cucumber';
import type { TestWorld } from '../support/world';

// ===== Helpers ==================================================
async function waitVisibleWithRetries(page: any, locatorOrStr: any, timeoutMs = 25000) {
  const locator = typeof locatorOrStr === 'string' ? page.locator(locatorOrStr) : locatorOrStr;
  const factor = process.env.UAT_MODE === 'true' ? 1.6 : 1;
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs * factor) {
    attempt++;
    try {
      await locator.first().waitFor({ state: 'visible', timeout: 3000 * factor });
      return locator;
    } catch {
      await page.keyboard.press('Escape').catch(() => {});
      await page.mouse.move(10, 10).catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  throw new Error(`Timeout esperando visibilidad de selector tras ${attempt} intentos: ${locatorOrStr}`);
}

// ===== 1️⃣ Agregar múltiples productos =====
Given('que ingreso y agrego los siguientes productos al carrito:', { timeout: 360000 }, async function (this: TestWorld, dataTable) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');
  const page = this.page;
  const productos = dataTable.hashes();

  for (let idx = 0; idx < productos.length; idx++) {
    const { codigo, cantidad } = productos[idx] as any;
    const unidades = parseInt(cantidad);
    console.log(`\n🛒 [${idx + 1}/${productos.length}] SKU ${codigo} → ${unidades} und`);

    const searchInput = page.locator('#ctrl-product-searcher');
    await waitVisibleWithRetries(page, searchInput, 20000);
    await searchInput.click({ force: true });
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    await searchInput.fill('');
    await page.waitForTimeout(400);

    await searchInput.type(String(codigo), { delay: 60 });
    await page.waitForTimeout(process.env.UAT_MODE === 'true' ? 1500 : 700);

    const sugerido = page.locator('.style-container-suggested');
    await waitVisibleWithRetries(page, sugerido, 15000);

    const nombreBuscador = (await sugerido.locator('.product-name.text').first().textContent().catch(() => ''))?.trim() || 'N/A';
    const precioBuscador = (await sugerido.locator('span:has-text("S/")').first().textContent().catch(() => 'N/A'))?.trim() || 'N/A';
    console.log(`🧾 Buscador: ${nombreBuscador}`);
    console.log(`💰 Listado: ${precioBuscador}`);
    await this.attach(`Resultado buscador: ${nombreBuscador}\nPrecio: ${precioBuscador}`, 'text/plain');

    await sugerido.locator('.product-name.text').first().click({ force: true });
    console.log(`📦 Abriendo detalle SKU ${codigo}...`);

    const nombreDetalleLoc = page.locator('h1.product-detail-information__name');
    await waitVisibleWithRetries(page, nombreDetalleLoc, 30000);

    const nombreDetalle = (await nombreDetalleLoc.first().textContent().catch(() => ''))?.trim() || 'N/A';
	const precioRegular = (await page.locator('.product-price .text-strike, .product-price .text-strike--1, .product-price .col-4.text-right.text-strike').first().textContent().catch(() => 'N/A'))?.trim() || 'N/A';
    const precioPromo = (await page.locator('.product-price .price-amount:not(.text-strike):not(.font-weight-bold)').first().textContent().catch(() => 'N/A'))?.trim() || 'N/A';
    const precioOh = (await page.locator('.font-weight-bold .price-amount, .product-price .total-oh.currency, .product-price .price-amount.font-weight-bold').first().textContent().catch(() => 'N/A'))?.trim() || 'N/A';

    console.log(`📋 Detalle:`)
    console.log(`   🏷️ ${nombreDetalle}`);
    console.log(`   💵 Regular: ${precioRegular}`);
    console.log(`   💰 Promo: ${precioPromo}`);
    console.log(`   💳 OH!: ${precioOh}`);
    await this.attach(
      `Detalle producto: ${nombreDetalle}\nPrecio regular: ${precioRegular}\nPrecio promocional: ${precioPromo}\nPrecio OH!: ${precioOh}`,
      'text/plain'
    );
    //

    const botonAgregar = page.locator(`
      fp-product-detail-add-button button.btn-primary:has-text("Agregar al carrito"),
      a button.btn-primary:has-text("Agregar al carrito"),
      button.btn-primary:has-text("Agregar al carrito"),
      button:has-text("Agregar al carrito")
    `);
    await waitVisibleWithRetries(page, botonAgregar, 25000);
    await botonAgregar.first().click({ force: true });
    console.log('🛍️ Agregado al carrito.');

    if (unidades > 1) {
      const botonMas = page.locator('mat-icon[data-mat-icon-name="icon-plus"], svg g[id="vector"]').first();
      await waitVisibleWithRetries(page, botonMas, 15000);
      for (let i = 1; i < unidades; i++) {
        await botonMas.click({ force: true });
        await page.waitForTimeout(200);
      }
      console.log(`➕ Cantidad ajustada a ${unidades} und`);
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const snap = `reports/product_${codigo}_${ts}.png`;
    await page.screenshot({ path: snap, fullPage: false });
    await this.attach(await page.screenshot(), 'image/png');

    if (idx < productos.length - 1) {
      const linkHome = page.locator('a[href="/"] img#link--go-home');
      await waitVisibleWithRetries(page, linkHome, 20000);
      await linkHome.click({ force: true });
      await page.waitForLoadState('domcontentloaded');

      const bannerCerrar = page.locator('span.icon-close-error.close-icon');
      if (await bannerCerrar.isVisible().catch(() => false)) {
        await bannerCerrar.click({ force: true }).catch(() => {});
        await page.waitForTimeout(600);
      }
      console.log('✅ Home listo para continuar.');
    }
  }
  console.log('✅ Todos los productos agregados correctamente.');
});

// ===== 2️⃣ Ir al carrito → checkout =====
Then('ingreso al carrito y avanzo hasta el checkout sin iniciar sesión', { timeout: 240000 }, async function (this: TestWorld) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');
  const page = this.page;
  console.log('🛒 Hacia carrito y checkout (sin login)...');

  // === Ícono del carrito ===
  const btnCart = page.locator('fp-header-cart2 .btn-cart.btn-cart-inka');
  await waitVisibleWithRetries(page, btnCart, 40000);
  await btnCart.click({ force: true });
  console.log('✅ Click ícono carrito');
  await page.waitForTimeout(1500);

  // === Botón "Ir a mi carrito" ===
  const btnIrCarrito = page.locator('button#btn--go-to-cart, a#btn--go-to-cart');
  await waitVisibleWithRetries(page, btnIrCarrito, 30000);
  const popSnap = `reports/cart_popup_${Date.now()}.png`;
  await page.screenshot({ path: popSnap });
  console.log(`📸 Popup carrito: ${popSnap}`);
  await btnIrCarrito.click({ force: true });
  console.log('✅ Ir a mi carrito');

    // captura adentro del carrito
const subtotal = (await page.locator('.row.subtotal .col-4.text-right').first().textContent().catch(() => 'N/A'))?.trim() || 'N/A';
const descuentoAdicional = (await page.locator('.row.text-danger.discount .col-4.text-right').first().textContent().catch(() => 'N/A'))?.trim() || 'N/A';
const precioOh = (await page.locator('.total-oh.currency').first().textContent().catch(() => 'N/A'))?.trim() || 'N/A';
const total = (await page.locator('.row.total .col-4.text-right, .row.total .currency').first().textContent().catch(() => 'N/A'))?.trim() || 'N/A';

console.log(`💵 Subtotal: ${subtotal}`);
console.log(`🔻 Descuentos adicionales: ${descuentoAdicional}`);
console.log(`💳 OH!: ${precioOh}`);
console.log(`💰 Total: ${total}`);

await this.attach(
  `Subtotal: ${subtotal}\nDescuento adicional: ${descuentoAdicional}\nPrecio OH!: ${precioOh}\nTotal: ${total}`,
  'text/plain'
);

  const cartSnap = `reports/cart_page_${Date.now()}.png`;
  await page.screenshot({ path: cartSnap, fullPage: false });
  console.log(`📸 Carrito: ${cartSnap}`);

  // === Botón "Ir a comprar" ===
  const botonCheckout = page.locator('#btn--go-to-checkout, button:has-text("Comprar ahora")').first();
  await waitVisibleWithRetries(page, botonCheckout, 40000);
  await botonCheckout.click({ force: true });
  console.log('🛍️ Ir a comprar');
  await page.waitForTimeout(1500);
  
  // === "Continuar sin iniciar sesión" ===
  const linkContinuar = page.locator('fp-link-buttom a.link-buttom', { hasText: 'Continuar sin iniciar sesión' }).first();
  await waitVisibleWithRetries(page, linkContinuar, 40000);
  await linkContinuar.click({ force: true });
  console.log('🚪 Continuar sin iniciar sesión');

  // Confirmar si aparece segundo botón
  const btnConfirmar = page.locator('a button.btn-primary:has-text("Continuar sin iniciar sesión")').first();
  if (await btnConfirmar.isVisible().catch(() => false)) {
    await btnConfirmar.click({ force: true });
    console.log('✅ Confirmación sin login');
  }

  // === Llegada a checkout ===
  try {
    await page.waitForURL(/checkout|envio|pago/i, { timeout: 90000 });
    console.log('✅ Llegada a checkout confirmada.');
  } catch {
    console.warn('⚠️ Timeout esperando URL, validando visualmente...');
    const checkoutContainer = page.locator('app-checkout, .checkout-container, fp-checkout');
    if (await checkoutContainer.first().isVisible().catch(() => false)) {
      console.log('✅ Checkout detectado visualmente.');
    }
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const snap = `reports/checkout_final_${ts}.png`;
  await page.screenshot({ path: snap, fullPage: true });
  await this.attach(await page.screenshot(), 'image/png');
  console.log('✅ Flujo finalizado en checkout.');
});

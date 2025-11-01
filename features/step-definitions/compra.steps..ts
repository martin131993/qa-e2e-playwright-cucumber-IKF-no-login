import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import type { TestWorld } from '../support/world';

// ===============================================================
// 🔹 1️⃣ Ingresar código y esperar que aparezca el producto automáticamente
// ===============================================================
Given('que ingreso el código {string} en el buscador de producto', { timeout: 20000 }, async function (this: TestWorld, codigo: string) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');

  const searchContainer = this.page.locator('.searcher-input');
  const searchInput = this.page.locator('#ctrl-product-searcher');

  await searchContainer.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.scrollIntoViewIfNeeded();

  await searchInput.click();
  await searchInput.fill('');
  await this.page.waitForTimeout(500);
  await searchInput.type(codigo, { delay: 150 });

  console.log(`🔎 Escribiendo código de producto: ${codigo}`);

  const productoVisible = this.page.locator('.product-name.text, .col-5.pointer');
  await productoVisible.first().waitFor({ state: 'visible', timeout: 15000 });

  console.log('✅ Resultado de búsqueda automática visible.');
});

// ===============================================================
// 🔹 2️⃣ Capturar datos del producto en la lista (sin entrar aún)
// ===============================================================
Then('visualizo el producto en la lista con su nombre y precio', async function (this: TestWorld) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');

  const nombreProducto = this.page.locator('.product-name.text').first();
  const precioProducto = this.page.locator('.card-price p.label--1').last();

  const nombre = (await nombreProducto.innerText()).trim();
  const precio = (await precioProducto.innerText()).trim();

  console.log(`🧾 Producto listado: ${nombre}`);
  console.log(`💰 Precio listado: ${precio}`);

  expect(nombre).to.not.be.empty;
  expect(precio).to.include('S/');

  await this.attach(`Producto listado: ${nombre}\nPrecio listado: ${precio}`, 'text/plain');
});

// ===============================================================
// 🔹 3️⃣ Ingresar al detalle del producto
// ===============================================================
When('ingreso al detalle del producto desde la lista', { timeout: 35000 }, async function (this: TestWorld) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');

  console.log('🖱️ Ingresando al detalle del producto (clic en tarjeta <fp-product-card-information>)...');

  const tarjetaProducto = this.page.locator('fp-product-card-information').first();
  await tarjetaProducto.waitFor({ state: 'visible', timeout: 15000 });
  await tarjetaProducto.scrollIntoViewIfNeeded();
  await tarjetaProducto.click({ force: true });
  console.log('✅ Click realizado sobre la tarjeta.');

  const detalleContainer = this.page.locator('.product-detail-container');
  const listado = this.page.locator('fp-product-card-information');

  console.log('⏳ Esperando cambio de vista (listado → detalle)...');
  await Promise.all([
    listado.first().waitFor({ state: 'detached', timeout: 25000 }).catch(() => null),
    detalleContainer.first().waitFor({ state: 'attached', timeout: 25000 }),
  ]);

  const nombreProducto = this.page.locator('.product-detail-information__name, h1.product-name');
  await nombreProducto.first().waitFor({ state: 'visible', timeout: 15000 });

  console.log('✅ Vista de detalle visible (.product-detail-container detectado).');
});

// ===============================================================
// 🔹 4️⃣ Capturar nombre y precio en el detalle
// ===============================================================
Then('verifico el nombre y precio del producto en el detalle', async function (this: TestWorld) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');

  const nombreDetalle = this.page.locator('h1, .product-name, .product-title');
  const precioDetalle = this.page.locator('.product-price, .price, .label--1 span');

  const nombre = (await nombreDetalle.first().innerText()).trim();
  const precio = (await precioDetalle.first().innerText()).trim();

  console.log(`📦 Detalle producto: ${nombre}`);
  console.log(`💲 Precio detalle: ${precio}`);

  expect(nombre).to.not.be.empty;
  expect(precio).to.include('S/');

  await this.attach(`Detalle producto: ${nombre}\nPrecio detalle: ${precio}`, 'text/plain');
});

// ===============================================================
// 🔹 5️⃣ Agregar producto al carrito
// ===============================================================
When('agrego el producto al carrito', async function (this: TestWorld) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');

  const botonAgregar = this.page.locator('button.btn-primary:has-text("Agregar al carrito")');
  await botonAgregar.waitFor({ state: 'visible', timeout: 10000 });
  await botonAgregar.click();

  console.log('🛒 Producto agregado al carrito.');
  await this.page.waitForTimeout(1500);
});

// ===============================================================
// 🔹 6️⃣ Incrementar cantidad dinámica (profesional con bucle)
// ===============================================================
When('aumento la cantidad a {int} unidades', async function (this: TestWorld, unidades: number) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');

  console.log(`➕ Aumentando cantidad a ${unidades} unidades...`);

  const botonMas = this.page.locator('button svg g[id="vector"]').first();
 // bucle que aumenta la cantidad segun el feature
  for (let i = 1; i < unidades; i++) {
    await botonMas.click({ force: true });
    await this.page.waitForTimeout(400);
  }

  console.log(`✅ Cantidad incrementada a ${unidades} unidades.`);
  await this.page.waitForTimeout(1500);
});

// ===============================================================
// 🔹 7️⃣ Tomar captura final
// ===============================================================
Then('tomo una captura final validando que se aumento a {int} los productos', async function (this: TestWorld, unidades: number) {
  if (!this.page) throw new Error('❌ No hay instancia de page disponible.');

  await this.page.setViewportSize({ width: 1920, height: 1080 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `reports/screenshot_final_${timestamp}.png`;

  await this.page.waitForTimeout(2000);
  const screenshot = await this.page.screenshot({
    path: fileName,
    fullPage: false,
  });

  await this.attach(screenshot, 'image/png');
  console.log(`📸 Screenshot final guardado en ${fileName} (cantidad: ${unidades}).`);
});

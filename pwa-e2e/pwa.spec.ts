import { expect, test, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

async function ready(page: Page) {
  await page.goto('/#/registros')
  await expect(page.getByRole('button', { name: 'Guardar registro', exact: true })).toBeEnabled()
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
}

test('manifiesto e iconos válidos, caché de recursos y modo sin conexión preparado', async ({ page, request }) => {
  await ready(page)
  const href = await page.locator('link[rel=manifest]').getAttribute('href')
  const manifest = await (await request.get(href!)).json()
  expect(manifest.name).toBe('Alpha')
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('./')
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512', '512x512'])
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src)
    expect(response.ok()).toBe(true)
    const png = await response.body()
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    const size = Number(icon.sizes.split('x')[0])
    expect(png.readUInt32BE(16)).toBe(size)
    expect(png.readUInt32BE(20)).toBe(size)
  }
  expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(true)
  const cached = await page.evaluate(async () => {
    const entries = await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(request => request.url)))
    return entries.flat()
  })
  expect(cached.some(url => url.includes('index.html'))).toBe(true)
  expect(cached.some(url => url.includes('.js'))).toBe(true)
  expect(cached.every(url => new URL(url).origin === locationOrigin(cached[0]))).toBe(true)
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Ajustes' }).click()
  await expect(page.getByText('Alpha está preparada para abrirse sin conexión en este navegador.')).toBeVisible()
})
function locationOrigin(url: string) { return new URL(url).origin }

test('importa CSV y descarga la plantilla sin conexión conservando datos al reabrir', async ({ page, context }) => {
  await ready(page)
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('navigation').getByRole('link', { name: 'Ajustes' }).click()
  const template = await page.getByRole('link', { name: 'Descargar plantilla CSV' }).getAttribute('href')
  const templateText = await page.evaluate(async url => {
    const response = await fetch(url!)
    if (!response.ok) throw new Error('Plantilla no disponible')
    return response.text()
  }, template)
  expect(templateText).toContain('fecha;agua_ml;sueno_hhmm')
  await page.getByLabel('Archivo CSV', { exact: true }).setInputFiles({ name: 'historial.csv', mimeType: 'text/csv', buffer: Buffer.from('fecha;sueno\n2026-01-01;07:30') })
  await page.getByLabel('Columna de fecha', { exact: true }).selectOption('0')
  await page.getByLabel('Columna de duración del sueño', { exact: true }).selectOption('1')
  await page.getByRole('button', { name: 'Revisar importación' }).click()
  await page.getByRole('button', { name: 'Importar datos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Importación completada' })).toBeVisible()
  await page.close()
  const reopened = await context.newPage()
  await reopened.goto('/#/registros?date=2026-01-01')
  await expect(reopened.getByLabel('Duración del sueño (HH:mm)', { exact: true })).toHaveValue('07:30')
  await reopened.getByLabel('Duración del sueño (HH:mm)', { exact: true }).fill('08:15')
  await reopened.getByRole('button', { name: 'Guardar registro', exact: true }).click()
  await expect(reopened.getByRole('region', { name: 'Tu registro diario' }).getByRole('status')).toContainText('Registro guardado')
  await reopened.reload()
  await expect(reopened.getByLabel('Duración del sueño (HH:mm)', { exact: true })).toHaveValue('08:15')
})

test('reabre y guarda registros y fases sin red con datos persistentes', async ({ page, context }) => {
  await ready(page)
  await page.getByLabel('Peso (kg)', { exact: true }).fill('73,5')
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Tu registro diario' }).getByRole('status')).toContainText('Registro guardado')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('73,5')
  await page.getByLabel('Agua (ml)', { exact: true }).fill('1500')
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Tu registro diario' }).getByRole('status')).toContainText('Registro guardado')
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Dieta' }).click()
  await page.getByRole('button', { name: 'Crear fase', exact: true }).click()
  await page.getByLabel('Nombre de la fase', { exact: true }).fill('Plan sin conexión')
  await page.getByLabel('Nombre de la comida 1', { exact: true }).fill('Cena')
  await page.getByLabel('Alimentos y cantidades de la comida 1', { exact: true }).fill('Arroz y verduras')
  await page.getByRole('button', { name: 'Guardar fase', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Plan sin conexión', exact: true })).toBeVisible()
  await page.close()
  const reopened = await context.newPage()
  await reopened.goto('/#/registros')
  await expect(reopened.getByLabel('Agua (ml)', { exact: true })).toHaveValue('1500')
  await expect(reopened.getByLabel('Peso (kg)', { exact: true })).toHaveValue('73,5')
  await reopened.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Dieta' }).click()
  await expect(reopened.getByRole('heading', { name: 'Plan sin conexión', exact: true })).toBeVisible()
  await expect(reopened.getByText('Sin conexión', { exact: true })).toBeVisible()
})

test('una versión nueva espera confirmación y conserva IndexedDB tras actualizar', async ({ page }) => {
  test.setTimeout(60000)
  await ready(page)
  await page.getByLabel('Peso (kg)', { exact: true }).fill('73,5')
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Tu registro diario' }).getByRole('status')).toContainText('Registro guardado')
  const path = new URL('../dist/sw.js', import.meta.url)
  const original = await readFile(path, 'utf8')
  try {
    await writeFile(path, `${original}\n// update-test-${Date.now()}\n`)
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration!.update() })
    const notice = page.getByRole('complementary', { name: 'Actualización disponible' })
    await expect(notice).toBeVisible({ timeout: 20000 })
    await page.getByLabel('Peso (kg)', { exact: true }).fill('74')
    page.once('dialog', dialog => dialog.dismiss())
    await notice.getByRole('button', { name: 'Actualizar Alpha' }).click()
    await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('74')
    await page.getByRole('button', { name: 'Guardar registro', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Tu registro diario' }).getByRole('status')).toContainText('Registro guardado')
    page.once('dialog', dialog => dialog.accept())
    await Promise.all([page.waitForEvent('load'), notice.getByRole('button', { name: 'Actualizar Alpha' }).click()])
    await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('74')
    await expect(notice).toHaveCount(0)
  } finally { await writeFile(path, original) }
})

test('el aviso de instalación solo se abre al pulsar y cancelar no marca la app como instalada', async ({ page }) => {
  await ready(page)
  const prevented = await page.evaluate(() => {
    const browser = window as Window & { installCalls?: number }
    browser.installCalls = 0
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(event, {
      prompt: async () => { browser.installCalls! += 1 },
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    })
    window.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(prevented).toBe(true)
  expect(await page.evaluate(() => (window as Window & { installCalls?: number }).installCalls)).toBe(0)
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'Instalar Alpha', exact: true }).click()
  expect(await page.evaluate(() => (window as Window & { installCalls?: number }).installCalls)).toBe(1)
  await expect(page.getByText('Puedes instalar Alpha más adelante.', { exact: true })).toBeVisible()
  await expect(page.getByText('Alpha está abierta como aplicación instalada.', { exact: true })).toHaveCount(0)
})

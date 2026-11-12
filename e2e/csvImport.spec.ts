import { expect, test, type Page } from '@playwright/test'

async function upload(page: Page, text: string) {
  await page.getByLabel('Archivo CSV', { exact: true }).setInputFiles({ name: 'historial.csv', mimeType: 'text/csv', buffer: Buffer.from(text) })
  await expect(page.getByLabel('Columna de fecha', { exact: true })).toBeVisible()
  await page.getByLabel('Columna de fecha', { exact: true }).selectOption('0')
}
async function records(page: Page) {
  return page.evaluate(async () => {
    if (!(await indexedDB.databases()).some(db => db.name === 'fitness-health-tracker')) return []
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('fitness-health-tracker')
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
    })
    const result = await new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction('dailyRecords').objectStore('dailyRecords').getAll()
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
    })
    db.close(); return result
  })
}

test('importa con formatos configurables, previsualiza conflictos y conserva datos al repetir', async ({ page }) => {
  await page.goto('/#/registros?date=2026-01-01')
  await expect(page.getByRole('button', { name: 'Guardar registro' })).toBeEnabled()
  await page.getByLabel('Agua (ml)', { exact: true }).fill('0')
  await page.getByRole('button', { name: 'Guardar registro' }).click()
  await expect(page.getByRole('status')).toContainText('Registro guardado')
  await page.getByRole('navigation').getByRole('link', { name: 'Ajustes' }).click()
  const csv = 'dia;agua;sueno;calidad;pasos;peso\n01/01/2026;2,5;07:30;85;0;72,5\n02/01/2026;3;08:00;92;9500;72,3'
  await upload(page, csv)
  for (const [name, column] of [['agua', '1'], ['duración del sueño', '2'], ['puntuación del sueño', '3'], ['pasos', '4'], ['peso', '5']]) {
    await page.getByLabel(`Columna de ${name}`, { exact: true }).selectOption(column)
  }
  await page.getByLabel('Formato de fecha', { exact: true }).selectOption('dmy')
  await page.getByLabel('Unidad del agua', { exact: true }).selectOption('l')
  await page.getByRole('button', { name: 'Revisar importación' }).click()
  await expect(page.getByRole('heading', { name: 'Revisar antes de importar' })).toBeVisible()
  expect(await records(page)).toHaveLength(1)
  await expect(page.locator('.import-preview')).toContainText('1 valor distinto conservado')
  await page.getByText('Ver diferencias (1)', { exact: true }).click()
  await expect(page.locator('.import-conflicts')).toContainText('guardado 0 ml; archivo 2.500 ml')
  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Importar datos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Importación completada' })).toBeVisible()
  const saved = await records(page)
  expect(saved).toEqual([
    expect.objectContaining({ date: '2026-01-01', waterMl: 0, sleepMinutes: 450, sleepScore: 85, steps: 0, weightKg: 72.5 }),
    expect.objectContaining({ date: '2026-01-02', waterMl: 3000, sleepMinutes: 480, sleepScore: 92, steps: 9500, weightKg: 72.3 }),
  ])
  await upload(page, csv)
  await page.getByLabel('Columna de agua', { exact: true }).selectOption('1')
  await page.getByLabel('Formato de fecha', { exact: true }).selectOption('dmy')
  await page.getByLabel('Unidad del agua', { exact: true }).selectOption('l')
  await page.getByRole('button', { name: 'Revisar importación' }).click()
  await page.getByRole('button', { name: 'Importar datos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Importación completada' })).toBeVisible()
  expect(await records(page)).toEqual(saved)
  await page.goto('/#/registros?date=2026-01-01')
  await expect(page.getByLabel('Duración del sueño (HH:mm)', { exact: true })).toHaveValue('07:30')
  await page.getByLabel('Duración del sueño (HH:mm)', { exact: true }).fill('07:60')
  await page.getByRole('button', { name: 'Guardar registro' }).click()
  await expect(page.getByRole('alert')).toContainText('HH:mm')
  await page.getByLabel('Duración del sueño (HH:mm)', { exact: true }).fill('08:15')
  await page.getByRole('button', { name: 'Guardar registro' }).click()
  await expect(page.getByRole('status')).toContainText('Registro guardado')
  await page.reload()
  await expect(page.getByLabel('Duración del sueño (HH:mm)', { exact: true })).toHaveValue('08:15')
})

test('bloquea todo el archivo con errores y permite corregir selección y reintentar fallos de escritura', async ({ page }) => {
  await page.goto('/#/ajustes')
  await upload(page, 'fecha;pasos\n2026-01-01;100\n2026-01-02;1,5')
  await page.getByLabel('Columna de pasos', { exact: true }).selectOption('1')
  await page.getByRole('button', { name: 'Revisar importación' }).click()
  await expect(page.getByRole('alert')).toContainText('Fila 3 · pasos')
  await expect(page.getByRole('button', { name: 'Importar datos', exact: true })).toHaveCount(0)
  expect(await records(page)).toEqual([])
  await upload(page, 'fecha;pasos\n2026-01-01;100\n2026-01-02;200')
  await page.getByLabel('Columna de pasos', { exact: true }).selectOption('0')
  await page.getByRole('button', { name: 'Revisar importación' }).click()
  await expect(page.getByRole('alert')).toContainText('columna distinta')
  await page.getByLabel('Columna de pasos', { exact: true }).selectOption('1')
  await page.getByRole('button', { name: 'Revisar importación' }).click()
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'dailyRecords' && args[0].date === '2026-01-02') throw new DOMException('Quota', 'QuotaExceededError')
      return original.apply(this, args)
    }
  })
  await page.getByRole('button', { name: 'Importar datos', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('No se ha guardado ningún cambio')
  expect(await records(page)).toEqual([])
  await expect(page.getByRole('button', { name: 'Importar datos', exact: true })).toBeEnabled()
})

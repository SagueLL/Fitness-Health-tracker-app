import { test, expect } from '@playwright/test'

test('navegación móvil y persistencia después de recargar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Un día a la vez.' })).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Ajustes' }).click()
  const input = page.getByLabel('Cantidad por pulsación (ml)')
  await expect(input).toHaveValue('250')
  await input.fill('350')
  await page.getByRole('button', { name: 'Guardar preferencia' }).click()
  await expect(page.getByRole('status')).toContainText('guardada')
  await page.reload()
  await expect(input).toHaveValue('350')
  await page.getByRole('navigation').getByRole('link', { name: 'Evolución' }).click()
  await expect(page.getByRole('heading', { name: 'Tu evolución.' })).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Dieta' }).click()
  await expect(page.getByRole('heading', { name: 'Nutrición con intención.' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('comunica un fallo de escritura sin confirmar el guardado', async ({ page }) => {
  await page.goto('/#/ajustes')
  await expect(page.getByLabel('Cantidad por pulsación (ml)')).toHaveValue('250')
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError') }
  })
  await page.getByRole('button', { name: 'Guardar preferencia' }).click()
  await expect(page.getByRole('alert')).toContainText('No se pudo guardar')
  await expect(page.getByRole('status')).toBeEmpty()
})

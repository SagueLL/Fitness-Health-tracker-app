import { expect, test, type Page } from '@playwright/test'
const localDate = () => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const shiftDate = (day: string, offset: number) => {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

async function seed(page: Page) {
  await page.goto('/#/registros')
  await expect(page.getByRole('button', { name: 'Guardar registro' })).toBeEnabled()
  const today = localDate()
  await page.evaluate(async ({ today }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('fitness-health-tracker')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const day = (offset: number) => {
      const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() + offset)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['dailyRecords', 'goals'], 'readwrite')
      const records = tx.objectStore('dailyRecords')
      for (const [offset, waterMl, weightKg] of [[-4, 0, 74], [-2, 2000, 73.5], [0, 2500, 73]]) {
        records.put({ date: day(offset), waterMl, weightKg, steps: 7000, sleepMinutes: 450, sleepScore: 80, createdAt: '', updatedAt: '' })
      }
      tx.objectStore('goals').put({ effectiveFrom: day(-4), waterMl: 1800, weightKg: 72 })
      tx.objectStore('goals').put({ effectiveFrom: day(-1), waterMl: 2400, weightKg: 72 })
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, { today })
}

test('gráficas, cobertura, objetivos históricos, periodos y edición desde la tabla', async ({ page }) => {
  await seed(page)
  await page.getByRole('navigation').getByRole('link', { name: 'Resumen' }).click()
  await page.getByRole('button', { name: '7 días', exact: true }).click()
  await expect(page.getByText('3 de 7 días registrados')).toBeVisible()
  await expect(page.getByText('2 de 3 días registrados con objetivo cumplido.', { exact: false })).toBeVisible()
  await expect(page.getByRole('table')).toContainText('1.800 ml')
  await expect(page.getByRole('table')).toContainText('2.400 ml')
  await page.getByRole('button', { name: /: 2.500 ml/ }).click()
  await expect(page.getByRole('status')).toContainText('2.500 ml')
  await page.getByRole('button', { name: 'Ver peso', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ver peso', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Media móvil de 7 días', { exact: true })).toBeVisible()
  await expect(page.getByText('-1 kg', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '90 días', exact: true }).click()
  await expect(page.getByText('3 de 90 días registrados')).toBeVisible()
  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const date = shiftDate(localDate(), -2)
  await page.getByRole('link', { name: `Editar registro del ${date}` }).click()
  await expect(page.getByLabel('Fecha del registro')).toHaveValue(date)
  await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('73,5')
})

test('objetivos básicos persistentes y reflejados en el registro diario', async ({ page }) => {
  await page.goto('/#/registros')
  await page.getByText('Objetivos y registro rápido', { exact: true }).click()
  const section = page.getByRole('region', { name: 'Objetivos sencillos' })
  await expect(section.getByRole('button', { name: 'Guardar objetivos' })).toBeEnabled()
  await section.getByLabel('Objetivo de agua (ml)').fill('2000')
  await section.getByLabel('Objetivo de pasos (pasos)').fill('8000')
  await section.getByLabel('Objetivo de duración del sueño (min)').fill('480')
  await section.getByLabel('Objetivo de peso (kg)').fill('72,5')
  await section.getByRole('button', { name: 'Guardar objetivos' }).click()
  await expect(section.getByRole('status')).toContainText('Objetivos guardados')
  await page.reload()
  await page.getByText('Objetivos y registro rápido', { exact: true }).click()
  await expect(section.getByLabel('Objetivo de peso (kg)')).toHaveValue('72,5')
  await section.getByLabel('Objetivo de agua (ml)').fill('2500')
  page.once('dialog', dialog => dialog.dismiss())
  await section.getByRole('button', { name: 'Guardar objetivos' }).click()
  await page.reload()
  await page.getByText('Objetivos y registro rápido', { exact: true }).click()
  await expect(section.getByLabel('Objetivo de agua (ml)')).toHaveValue('2000')
  await page.getByRole('navigation').getByRole('link', { name: 'Registros', exact: true }).click()
  await expect(page.getByText('Objetivo: 2.000 ml', { exact: true })).toBeVisible()
})

test('el carrusel responde al desplazamiento y al teclado y comparte el periodo', async ({ page }) => {
  await seed(page)
  await page.getByRole('navigation').getByRole('link', { name: 'Resumen', exact: true }).click()
  const carousel = page.getByRole('group', { name: 'Desliza para cambiar de métrica', exact: true })
  await expect(carousel).toBeVisible()
  await carousel.evaluate(element => { element.scrollLeft = (element.children[1] as HTMLElement).offsetLeft })
  await expect(page.getByRole('button', { name: 'Ver duración del sueño', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '7 días', exact: true }).click()
  await expect(page.getByText('3 de 7 días registrados')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Gráfica de duración del sueño', exact: true })).toBeVisible()
  await carousel.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Ver puntuación del sueño', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Métrica siguiente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ver pasos', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '90 días', exact: true }).click()
  await expect(page.getByText('3 de 90 días registrados')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ver pasos', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Ver agua', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ver agua', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('tabla limitada a cinco filas, colores por tramo y acceso a los registros restantes', async ({ page }) => {
  await seed(page)
  const today = localDate()
  await page.evaluate(async ({ today }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('fitness-health-tracker')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('dailyRecords', 'readwrite')
      for (const [index, sleepScore] of [95, 85, 75, 65, 55, 45, 90, 80].entries()) {
        const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() - index)
        tx.objectStore('dailyRecords').put({ date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, sleepScore, sleepMinutes: 420 + index * 5, waterMl: 1800, createdAt: '', updatedAt: '' })
      }
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, { today })
  await page.getByRole('navigation').getByRole('link', { name: 'Resumen', exact: true }).click()
  await page.getByRole('button', { name: 'Ver puntuación del sueño', exact: true }).click()
  const table = page.getByRole('region', { name: /^Tabla de puntuación del sueño/ })
  await expect(table.locator('tbody tr')).toHaveCount(8)
  for (const [index, tone] of ['pink', 'lime', 'green', 'yellow', 'brown', 'red', 'pink', 'lime'].entries()) {
    await expect(table.locator('tbody tr').nth(index)).toHaveClass(new RegExp(`tone-${tone}`))
  }
  await page.setViewportSize({ width: 360, height: 800 })
  await expect.poll(() => table.evaluate(element => {
    const fifth = element.querySelectorAll('tbody tr')[4].getBoundingClientRect()
    return Math.abs(element.clientHeight - (fifth.bottom - element.getBoundingClientRect().top)) < 3
  })).toBe(true)
  expect(await table.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  await page.getByRole('button', { name: 'Ver duración del sueño', exact: true }).click()
  const durations = page.getByRole('region', { name: /^Tabla de duración del sueño/ })
  for (const [index, tone] of ['pink', 'lime', 'green', 'yellow', 'brown', 'red', 'pink', 'lime'].entries()) {
    await expect(durations.locator('tbody tr').nth(index)).toHaveClass(new RegExp(`tone-${tone}`))
  }
  await expect(durations.getByRole('columnheader', { name: 'Calidad', exact: true })).toBeVisible()
  await expect(page.locator('.sleep-average')).toHaveClass(/tone-green/)
  await expect(page.getByRole('region', { name: 'Tu rango observado' })).toContainText('8 de 14')
  await page.getByRole('button', { name: 'Ver puntuación del sueño', exact: true }).click()
  const chart = page.getByRole('region', { name: 'Gráfica de puntuación del sueño', exact: true })
  await expect(chart.locator('svg text').filter({ hasText: /^100$/ })).toHaveCount(1)
  await expect(chart.locator('svg text').filter({ hasText: /^125$/ })).toHaveCount(0)
  await table.evaluate(element => { element.scrollTop = element.scrollHeight })
  expect(await table.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  const date = shiftDate(today, -7)
  await table.getByRole('link', { name: `Editar registro del ${date}` }).click()
  await expect(page.getByLabel('Fecha del registro')).toHaveValue(date)
  await expect(page.getByLabel('Puntuación del sueño (0–100)', { exact: true })).toHaveValue('80')
})

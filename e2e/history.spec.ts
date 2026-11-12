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
  await expect(page.locator('.summary-grid').getByText('3 de 7 días registrados')).toBeVisible()
  await page.getByRole('button', { name: 'Ver agua', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ver agua', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('table').getByRole('columnheader')).toHaveText(['Fecha', 'Registro'])
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '21')
  await expect(page.getByRole('progressbar')).toContainText('4,5 / 21 L')
  await page.getByRole('button', { name: 'Ver peso', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ver peso', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Media móvil de 7 días', { exact: true })).toBeVisible()
  await expect(page.getByRole('table').getByRole('columnheader')).toHaveText(['Fecha', 'Registro', 'Objetivo'])
  await expect(page.getByText('-1 kg', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /: 73 kg/ }).click()
  await expect(page.getByRole('status')).toContainText('73 kg')
  await page.getByRole('button', { name: '90 días', exact: true }).click()
  await expect(page.locator('.summary-grid').getByText('3 de 90 días registrados')).toBeVisible()
  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const date = shiftDate(localDate(), -2)
  await page.getByRole('link', { name: `Editar registro del ${date}` }).click()
  await expect(page.getByLabel('Fecha del registro')).toHaveValue(date)
  await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('73,5')
  await expect(page.getByLabel('Duración del sueño (HH:mm)', { exact: true })).toHaveValue('07:30')
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
  await expect(page.getByRole('button', { name: 'Ver puntuación del sueño', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '7 días', exact: true }).click()
  await expect(page.locator('.summary-grid').getByText('3 de 7 días registrados')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Gráfica de puntuación del sueño', exact: true })).toBeVisible()
  await carousel.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Ver duración del sueño', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Métrica siguiente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ver pasos', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '90 días', exact: true }).click()
  await expect(page.locator('.summary-grid').getByText('3 de 90 días registrados')).toBeVisible()
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
  await expect(table.locator('.record-value').first()).toHaveText('95')
  await expect(table.locator('.record-value').first()).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(table.locator('td').first()).toHaveCSS('text-align', 'center')
  await expect(page.locator('.summary-grid strong').first()).toHaveText('73,8')
  await expect(page.locator('.summary-grid strong').first()).toHaveCSS('text-align', 'center')
  await expect(page.locator('.summary-grid')).not.toContainText('puntos')
  await expect(page.locator('.history-records > p, .table-hint, .history-records > a')).toHaveCount(0)
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
  await expect(durations.getByRole('columnheader')).toHaveText(['Fecha', 'Registro'])
  await expect(durations.locator('.record-value').first()).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(page.locator('.sleep-quality')).toBeVisible()
  expect(await page.locator('.sleep-quality').evaluate(element => {
    const visible = element.cloneNode(true) as HTMLElement
    visible.querySelectorAll('.sr-only').forEach(node => node.remove())
    return visible.textContent
  })).toBe('73,8')
  await expect(page.locator('.sleep-average')).toHaveClass(/tone-green/)
  await expect(page.getByRole('region', { name: 'Tu rango observado' })).toContainText('8 de 14')
  await page.getByRole('button', { name: 'Ver puntuación del sueño', exact: true }).click()
  const chart = page.getByRole('region', { name: 'Gráfica de puntuación del sueño', exact: true })
  await expect(table.getByRole('columnheader')).toHaveText(['Fecha', 'Registro'])
  await expect(chart.locator('svg text').filter({ hasText: /^100$/ })).toHaveCount(1)
  await expect(chart.locator('svg text').filter({ hasText: /^125$/ })).toHaveCount(0)
  await table.evaluate(element => { element.scrollTop = element.scrollHeight })
  expect(await table.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  const date = shiftDate(today, -7)
  await table.getByRole('link', { name: `Editar registro del ${date}` }).click()
  await expect(page.getByLabel('Fecha del registro')).toHaveValue(date)
  await expect(page.getByLabel('Puntuación del sueño (0–100)', { exact: true })).toHaveValue('80')
})

test('agua circular, medias por colores y nuevo orden del carrusel', async ({ page }) => {
  await seed(page)
  const today = localDate()
  await page.evaluate(async ({ today }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('fitness-health-tracker'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('dailyRecords', 'readwrite')
      for (let i = 0; i < 7; i++) {
        const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - i)
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        tx.objectStore('dailyRecords').put({ date, waterMl: 3000, sleepScore: 95, createdAt: '', updatedAt: '' })
      }
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
    }); db.close()
  }, { today })
  await page.getByRole('navigation').getByRole('link', { name: 'Resumen', exact: true }).click()
  await expect(page.locator('.metric-dots button').first()).toHaveAttribute('aria-label', 'Ver peso')
  await expect(page.locator('.metric-dots button')).toHaveCount(5)
  expect(await page.locator('.metric-dots button').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')))).toEqual(['Ver peso', 'Ver puntuación del sueño', 'Ver duración del sueño', 'Ver pasos', 'Ver agua'])
  await page.getByRole('button', { name: '7 días', exact: true }).click()
  await page.getByRole('button', { name: 'Ver puntuación del sueño', exact: true }).click()
  await expect(page.locator('.average-highlight')).toHaveClass(/tone-pink/)
  await page.getByRole('button', { name: 'Ver agua', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  await expect(page.getByRole('progressbar')).toContainText('21 / 21 L')
  await expect(page.locator('.average-highlight')).toHaveClass(/tone-pink/)
  await expect(page.locator('.average-highlight')).toContainText('Excelente')
  await page.getByRole('button', { name: '30 días', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '23')
  await expect(page.getByRole('progressbar')).toContainText('21 / 90 L')
  await page.getByRole('button', { name: '90 días', exact: true }).click()
  await expect(page.getByRole('progressbar')).toContainText('21 / 270 L')
  await expect(page.getByText(/Huecos:|Eje ajustado/)).toHaveCount(0)
})

test('los cinco paneles comparten exactamente la altura de las gráficas de líneas', async ({ page }) => {
  await seed(page)
  await page.getByRole('navigation').getByRole('link', { name: 'Resumen', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  for (const width of [360, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.locator('.metric-slide').evaluateAll(slides => {
      const heights = slides.map(slide => slide.getBoundingClientRect().height)
      return heights.every(height => height > 200 && Math.abs(height - heights[0]) < .1)
    })).toBe(true)
    await page.getByRole('button', { name: 'Ver agua', exact: true }).click()
    await expect(page.getByRole('progressbar')).toBeVisible()
    await expect.poll(() => page.locator('.metric-carousel').evaluate(track => {
      const water = track.children[4].getBoundingClientRect()
      return Math.abs(track.getBoundingClientRect().height - water.height) < .1
    })).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

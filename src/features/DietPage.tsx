import { NavLink, Route, Routes } from 'react-router-dom'
import NutritionPage from './NutritionPage'
import DietPlans from './DietPlans'

export default function DietPage() {
  return <><h1 className="page-title">Dieta</h1>
    <nav className="diet-tabs" aria-label="Secciones de dieta"><NavLink to="/dieta" end>Mi dieta</NavLink><NavLink to="/dieta/calculadora">Calculadora</NavLink></nav>
    <Routes><Route index element={<DietPlans />} /><Route path="calculadora" element={<NutritionPage />} /><Route path="*" element={<p>Sección no encontrada. Puedes volver a Mi dieta.</p>} /></Routes>
  </>
}

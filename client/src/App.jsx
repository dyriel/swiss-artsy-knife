import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import DemoNotice from './components/DemoNotice.jsx'
import Home from './pages/Home.jsx'
import PaletteStudio from './pages/PaletteStudio.jsx'
import SavedPalettes from './pages/SavedPalettes.jsx'
import BackgroundEraser from './pages/BackgroundEraser.jsx'
import ZineLayout from './pages/ZineLayout.jsx'
import QRGenerator from './pages/QRGenerator.jsx'
import { useSavedPalettes } from './lib/Savedpalettes.js'

// The template's sightings demo is gone. What is kept from it is DemoNotice,
// which shows a banner while VITE_USE_MOCK_API is not "false" and disappears
// by itself once the real API is switched on.
//
// Saved palettes live here, above the screens, because three of them use the
// list: Palette Studio saves to it, Saved palettes manages it, Home shows the
// latest few. Today it is a localStorage store (lib/savedPalettes.js). When the
// API exists, that file is the only thing that changes; build its loading /
// ready / error states the way the template's old App.jsx did.

export default function App() {
  const { saved, add, remove } = useSavedPalettes()

  return (
    <>
      <Header />
      <DemoNotice />
      <Routes>
        <Route path="/" element={<Home saved={saved} />} />
        <Route path="/palette" element={<PaletteStudio onSave={add} />} />
        <Route path="/saved" element={<SavedPalettes saved={saved} onDelete={remove} />} />
        <Route path="/eraser" element={<BackgroundEraser />} />
        <Route path="/zine" element={<ZineLayout />} />
        <Route path="/qr" element={<QRGenerator />} />
      </Routes>
    </>
  )
}
import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Matches from './pages/Matches'
import Ranking from './pages/Ranking'
import MyPredictions from './pages/MyPredictions'
import PredictMatches from './pages/PredictMatches'
import EditPredictions from './pages/EditPredictions'
import ChangePassword from './pages/ChangePassword'
import UpdatePassword from './pages/UpdatePassword' 
import Confirmation from './auth/Confirm'
import FairytaleEnding from './pages/FairytaleEnding'
import AdminScreen from './pages/AdminScreen'
import PlayerProfile from './pages/PlayerProfile'
import { NotificationProvider } from './components/NotificationProvider'

const MOBILE_BACKGROUND_MAX_WIDTH = 700

export default function App() {
  useEffect(() => {
    document.body.dataset.backgroundVariant =
      window.innerWidth <= MOBILE_BACKGROUND_MAX_WIDTH ? 'mobile' : 'desktop'

    return () => {
      delete document.body.dataset.backgroundVariant
    }
  }, [])

  return (
    <NotificationProvider>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/partidos" element={<Matches />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/perfil/:userId" element={<PlayerProfile />} />
        <Route path="/mis-pronosticos" element={<MyPredictions />} />
        <Route path="/" element={<Home />} />
        <Route path="/predecir-partidos/:matchId" element={<PredictMatches />} />
        <Route path= "/actualizar-pronosticos/:predictionId" element={<EditPredictions />}/>
        <Route path= "/cambiar-contraseña" element={<ChangePassword />}/>
        <Route path= "/contraseña-nueva" element={<UpdatePassword />}/>
        <Route path= "/auth/confirm" element={<Confirmation />}/>
        <Route path = "/mi-final-sonada" element= {<FairytaleEnding/>}/>
        <Route path = "/panel-de-administrador" element= {<AdminScreen/>}/>

      </Routes>
    </NotificationProvider>
  )
}

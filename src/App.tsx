import { useState } from 'react'
import { Table } from './components/Table'
import { SpadesTable } from './spades/SpadesTable'
import { GameHub } from './components/GameHub'

export type ActiveGame = 'hub' | 'bura' | 'spades'

export function App() {
  const [activeGame, setActiveGame] = useState<ActiveGame>('hub')

  if (activeGame === 'bura') {
    return (
      <div className="w-full min-h-screen bg-neutral-950 flex flex-col items-center">
        <Table onBackToMenu={() => setActiveGame('hub')} />
      </div>
    )
  }

  if (activeGame === 'spades') {
    return (
      <div className="w-full min-h-screen bg-[#07130c] flex flex-col items-center">
        <SpadesTable onExitToHub={() => setActiveGame('hub')} />
      </div>
    )
  }

  return <GameHub onSelectGame={(game) => setActiveGame(game)} />
}

export default App

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import SupplyMap from './components/SupplyMap'
import YearBar from './components/YearBar'
import './styles.css'

// Global store: selected year and selected node
const useStore = create((set) => ({
  year: 2010,
  setYear: (y) => set({ year: y }),
  selectedNode: null,
  setSelectedNode: (n) => set({ selectedNode: n })
}))

export default function App() {
  const { year, setYear, selectedNode, setSelectedNode } = useStore()
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  useEffect(() => {
    async function load() {
      const n = await fetch(`${import.meta.env.BASE_URL}nodes.json`).then(r => r.json())
      const e = await fetch(`${import.meta.env.BASE_URL}edges.json`).then(r => r.json())
      setNodes(n)
      setEdges(e)
    }
    load()
  }, [])

  return (
    <div className="app">
      <div className="page">
        <div className="topbar">
          <h1>EU Rare Earths Permanent Magnet Supply Chain</h1>
          <YearBar year={year} setYear={setYear} years={[2010, 2015, 2018, 2020, 2024]} />
        </div>

        {/* Single centered column */}
        <div className="content">
          <SupplyMap
            year={year}
            nodes={nodes}
            edges={edges}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onCloseSidebar={() => setSelectedNode(null)}
          />
        </div>
      </div>
    </div>
  )
}
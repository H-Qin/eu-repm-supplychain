import { useEffect, useState } from 'react'
import { create } from 'zustand'
import SupplyMap from './components/SupplyMap'
import YearBar from './components/YearBar'
import IndicatorsPanel from './components/IndicatorsPanel'
import Sidebar from './components/Sidebar'
import './styles.css'

// Global store: selected year and selected node
const useStore = create((set) => ({
  year: 2020,
  setYear: (y) => set({ year: y }),
  selectedNode: null,
  selectedEdge: null,
  setSelectedNode: (node) =>
    set({ selectedNode: node, selectedEdge: null }),  // clear edge when node selected
  setSelectedEdge: (edge) =>
    set({ selectedEdge: edge, selectedNode: null }),  // clear node when edge selected

  clearSelection: () => set({ selectedNode: null, selectedEdge: null }),

  // Process filters: store numbers like 1,2,3,...
  selectedProcesses: [],
  toggleProcess: (proc) =>
    set((state) =>
      state.selectedProcesses.includes(proc)
        ? { selectedProcesses: state.selectedProcesses.filter((p) => p !== proc) }
        : { selectedProcesses: [...state.selectedProcesses, proc] }
    ),
}))

export default function App() {
  const { year, setYear, selectedNode, selectedEdge, setSelectedNode, setSelectedEdge, clearSelection, selectedProcesses, toggleProcess, } = useStore()
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [mobileTab, setMobileTab] = useState('map')

  useEffect(() => {
    async function load() {
      const n = await fetch(`${import.meta.env.BASE_URL}nodes.json`).then(r => r.json())
      const e = await fetch(`${import.meta.env.BASE_URL}edges.json`).then(r => r.json())
      setNodes(n)
      setEdges(e)
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedNode || selectedEdge) setMobileTab('detail')
  }, [selectedNode, selectedEdge])

  function handleClearSelection() {
    clearSelection()
    setMobileTab('map')
  }

  return (
    <div className="app">
      <div className="page">
        <div className="topbar">
          <h1>European Rare-Earths (NdFeB) Permanent Magnet Supply Chain</h1>
          <YearBar
            year={year}
            setYear={setYear}
            years={Array.from({ length: 2024 - 2004 + 1 }, (_, i) => 2004 + i)}
          />
        </div>

        <div className="content">
          <div className={`map-panel${mobileTab === 'map' ? ' tab-active' : ''}`}>
            <SupplyMap
              year={year}
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              selectedProcesses={selectedProcesses}
              onSelectNode={setSelectedNode}
              onSelectEdge={setSelectedEdge}
              onToggleProcess={toggleProcess}
              onCloseSidebar={handleClearSelection}
            />
          </div>
          <div className="right-column">
            {(selectedNode || selectedEdge) ? (
              <div className={`mobile-panel${mobileTab === 'detail' ? ' tab-active' : ''}`}>
                <Sidebar
                  node={selectedNode}
                  edge={selectedEdge}
                  nodes={nodes}
                  edges={edges}
                  year={year}
                  onClose={handleClearSelection}
                />
              </div>
            ) : (
              <div className={`mobile-panel${mobileTab === 'indicators' ? ' tab-active' : ''}`}>
                <IndicatorsPanel year={year} />
              </div>
            )}
          </div>
        </div>

        <nav className="tab-bar">
          <button
            className={`tab-bar__btn${mobileTab === 'map' ? ' tab-bar__btn--active' : ''}`}
            onClick={() => setMobileTab('map')}
          >Map</button>
          <button
            className={`tab-bar__btn${mobileTab === 'indicators' ? ' tab-bar__btn--active' : ''}`}
            onClick={() => setMobileTab('indicators')}
          >Indicators</button>
          {(selectedNode || selectedEdge) && (
            <button
              className={`tab-bar__btn${mobileTab === 'detail' ? ' tab-bar__btn--active' : ''}`}
              onClick={() => setMobileTab('detail')}
            >Detail</button>
          )}
        </nav>
      </div>
    </div>
  )
}

import { createSignal, type Component } from 'solid-js'
import { Console } from './Console'
import { StoreInspector } from './StoreInspector'
import { InputMonitor } from './InputMonitor'
import { EventsPanel } from './EventsPanel'
import { devtoolsStyles as s } from './styles'

type TabId = 'console' | 'store' | 'input' | 'events'

const tabs: { id: TabId; label: string }[] = [
  { id: 'console', label: 'Console' },
  { id: 'store', label: 'Store' },
  { id: 'input', label: 'Input' },
  { id: 'events', label: 'Events' },
]

const DevTools: Component = () => {
  const [activeTab, setActiveTab] = createSignal<TabId>('console')

  return (
    <div style={s.container}>
      <div style={s.tabBar}>
        {tabs.map((tab) => (
          <button
            style={{
              ...s.tab,
              ...(activeTab() === tab.id ? s.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={s.panel}>
        <div style={{ display: activeTab() === 'console' ? 'block' : 'none', height: '100%' }}>
          <Console />
        </div>
        <div style={{ display: activeTab() === 'store' ? 'block' : 'none', height: '100%' }}>
          <StoreInspector />
        </div>
        <div style={{ display: activeTab() === 'input' ? 'block' : 'none', height: '100%' }}>
          <InputMonitor />
        </div>
        <div style={{ display: activeTab() === 'events' ? 'block' : 'none', height: '100%' }}>
          <EventsPanel />
        </div>
      </div>
    </div>
  )
}

export default DevTools

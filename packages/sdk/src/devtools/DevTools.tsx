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
        {activeTab() === 'console' && <Console />}
        {activeTab() === 'store' && <StoreInspector />}
        {activeTab() === 'input' && <InputMonitor />}
        {activeTab() === 'events' && <EventsPanel />}
      </div>
    </div>
  )
}

export default DevTools

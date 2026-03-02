export const devtoolsStyles = {
  container: {
    display: 'flex',
    'flex-direction': 'column' as const,
    height: '100vh',
    'background-color': '#1a1a2e',
    color: '#e0e0e0',
    'font-family': "'JetBrains Mono', 'Fira Code', monospace",
    'font-size': '12px',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    gap: '0',
    'border-bottom': '1px solid #2a2a4a',
    'background-color': '#16162a',
    'padding-left': '8px',
  },
  tab: {
    padding: '8px 16px',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: '#888',
    'font-size': '12px',
    'font-family': 'inherit',
    'border-bottom': '2px solid transparent',
    transition: 'all 0.15s',
  },
  tabActive: {
    color: '#e0e0e0',
    'border-bottom-color': '#6c63ff',
  },
  panel: {
    flex: '1',
    overflow: 'hidden',
    padding: '8px',
  },
} as const

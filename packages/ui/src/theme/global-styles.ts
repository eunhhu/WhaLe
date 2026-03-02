export const globalResetStyles = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--whale-bg);
    color: var(--whale-text);
    line-height: 1.5;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: var(--whale-bg);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--whale-border);
    border-radius: 3px;
  }
`

export const globalResetStyles = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body, #root {
    width: 100%;
    height: 100%;
  }
  html, body {
    margin: 0;
    padding: 0;
    overscroll-behavior: none;
  }
  html {
    overflow: hidden;
    background: var(--whale-bg);
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--whale-bg);
    color: var(--whale-text);
    line-height: 1.5;
    overflow: auto;
  }
  body[data-transparent="true"] {
    background: transparent !important;
  }
  html[data-transparent="true"] {
    background: transparent !important;
  }
  body[data-transparent="true"] #root,
  body[data-transparent="true"] [data-whale-theme-root] {
    background: transparent !important;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: var(--whale-surface);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--whale-dim);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--whale-text);
  }
`

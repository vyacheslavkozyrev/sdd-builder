import { createRoot } from 'react-dom/client';

// Hello-world placeholder until the wizard shell arrives (F-05).
function App() {
  return <h1>SDDBuilder</h1>;
}

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(<App />);

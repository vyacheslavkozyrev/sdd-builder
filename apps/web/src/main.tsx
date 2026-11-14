import { createRoot } from 'react-dom/client';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('The #root element is missing from index.html');
}

createRoot(root).render(null);

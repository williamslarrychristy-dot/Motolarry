import { useState } from 'react';
import Layout, { Page } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import POS from './pages/POS';
import Sales from './pages/Sales';
import Stock from './pages/Stock';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  const content = {
    dashboard: <Dashboard />,
    products: <Products />,
    pos: <POS />,
    sales: <Sales />,
    stock: <Stock />,
    customers: <Customers />,
    suppliers: <Suppliers />,
    'import-export': <ImportExport />,
    settings: <Settings />,
  }[page];

  return (
    <Layout current={page} onNavigate={setPage}>
      {content}
    </Layout>
  );
}

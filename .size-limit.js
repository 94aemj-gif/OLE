export default [
  {
    name: 'operator tablet (index.html)',
    path: 'dist/assets/index-*.js',
    limit: '80 KB'
  },
  {
    name: 'tablero (dashboard.html)',
    path: 'dist/assets/dashboard-*.js',
    limit: '120 KB'
  },
  {
    name: 'admin',
    path: 'dist/assets/admin-*.js',
    limit: '180 KB'
  },
  {
    name: 'graficas (chart.js dynamic-imported)',
    path: 'dist/assets/graficas-*.js',
    limit: '200 KB'
  }
];

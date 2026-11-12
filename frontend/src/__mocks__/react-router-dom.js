const React = require('react');

module.exports = {
  BrowserRouter: ({ children }) => React.createElement('div', { 'data-testid': 'router' }, children),
  Routes: ({ children }) => React.createElement('div', { 'data-testid': 'routes' }, children),
  Route: ({ element }) => React.createElement('div', { 'data-testid': 'route' }, element),
  Navigate: () => React.createElement('div', null, 'Redirect'),
  Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
};

// Dynamically determine API_URL so it works seamlessly on PC (localhost), mobile devices on Wi-Fi, and public deployments (Vercel/Netlify/Cloud)
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location;
    
    // If running on a public HTTPS domain (e.g. Vercel, Netlify, Render, GitHub Pages)
    // Mixed content (http on https) is blocked by browsers, so don't hit http://:5001
    if (protocol === 'https:' && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
      // Use relative path or custom public API if defined
      return window.location.origin;
    }

    // Use the exact IP or domain the frontend was loaded from (works for local network / LAN)
    return `http://${hostname}:5001`;
  }
  
  return 'http://localhost:5001';
};

const API_URL = getApiUrl();

export default API_URL;

// Dynamically determine API_URL so both laptop (localhost) and mobile/Vercel connect to the live cloud MongoDB backend
const CLOUD_BACKEND_URL = 'https://backend-production-2a6f81f1.up.railway.app';

const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  return CLOUD_BACKEND_URL;
};

const API_URL = getApiUrl();

export default API_URL;

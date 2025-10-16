const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Auto-detect backend URL based on environment
  const getBackendUrl = () => {
    // Check if running in Docker (backend service available)
    if (process.env.DOCKER_ENV || process.env.NODE_ENV === 'docker') {
      return 'http://backend:8000';
    }
    
    // Check for explicit backend URL
    if (process.env.REACT_APP_BACKEND_URL) {
      return process.env.REACT_APP_BACKEND_URL;
    }
    
    // Default to localhost for local development
    return 'http://localhost:8000';
  };

  const backendUrl = getBackendUrl();
  console.log('[Proxy] 🔗 Backend URL:', backendUrl);

  const proxyConfig = {
    target: backendUrl,
    changeOrigin: true,
    logLevel: 'info',
    timeout: 5000,
    onProxyReq: (proxyReq, req, res) => {
      console.log('[Proxy] ✅ Request:', req.method, req.path);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log('[Proxy] ✅ Response:', proxyRes.statusCode);
    },
    onError: (err, req, res) => {
      console.error('[Proxy] ❌ Error:', err.message);
      console.error('[Proxy] 💡 Make sure backend is running on:', backendUrl);
      res.status(500).json({ 
        error: 'Backend connection failed', 
        detail: `Cannot connect to ${backendUrl}. Is the backend server running?`,
        backend_url: backendUrl 
      });
    },
  };

  app.use('/auth', createProxyMiddleware(proxyConfig));
  app.use('/api', createProxyMiddleware(proxyConfig));
  app.use('/health', createProxyMiddleware(proxyConfig));

  // Admin API (8031) proxy for lead scanning and admin endpoints
  const adminUrl = process.env.REACT_APP_ADMIN_API || 'http://localhost:8031';
  console.log('[Proxy] 🔗 Admin API URL:', adminUrl);
  const adminProxy = {
    ...proxyConfig,
    target: adminUrl,
    // Long-running scan may take up to ~120s; extend proxy timeouts
    timeout: 180000,
    proxyTimeout: 180000,
    // Strip the /admin prefix so Admin API receives /leads/... not /admin/leads/...
    pathRewrite: { '^/admin': '' },
  };
  app.use('/admin', createProxyMiddleware(adminProxy));
};


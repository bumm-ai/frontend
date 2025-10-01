// API configuration for Bumm Backend
// Direct backend access (only for local development)
// export const API_BASE_URL = 'http://69.62.126.240:8081';

// Use Next.js API proxy to bypass CORS and Mixed Content
export const API_BASE_URL = '/api/backend';

export const API_ENDPOINTS = {
  HEALTH: '/health/',
  BUMM_LIST: '/api/v1/bumm/list/',
  BUMM_GENERATE: '/api/v1/bumm/generate/',
  BUMM_STATUS_GENERATE: '/api/v1/bumm/status/generate/',
  BUMM_AUDIT: '/api/v1/bumm/audit/',
  BUMM_AUDIT_STATUS: '/api/v1/bumm/audit/status/',
  BUMM_BUILD: '/api/v1/bumm/build/',
  BUMM_BUILD_STATUS: '/api/v1/bumm/build/status/',
  BUMM_DEPLOY: '/api/v1/bumm/deploy/',
  BUMM_DEPLOY_STATUS: '/api/v1/bumm/deploy/status/',
  USER_WALLET: '/api/v1/user/wallet/'
} as const;

// HTTP методы для каждого эндпоинта
export const API_METHODS = {
  [API_ENDPOINTS.HEALTH]: 'GET',
  [API_ENDPOINTS.BUMM_LIST]: 'GET',
  [API_ENDPOINTS.BUMM_GENERATE]: 'POST',
  [API_ENDPOINTS.BUMM_STATUS_GENERATE]: 'GET',
  [API_ENDPOINTS.BUMM_AUDIT]: 'POST',
  [API_ENDPOINTS.BUMM_AUDIT_STATUS]: 'GET',
  [API_ENDPOINTS.BUMM_BUILD]: 'POST',
  [API_ENDPOINTS.BUMM_BUILD_STATUS]: 'GET',
  [API_ENDPOINTS.BUMM_DEPLOY]: 'POST',
  [API_ENDPOINTS.BUMM_DEPLOY_STATUS]: 'GET',
  [API_ENDPOINTS.USER_WALLET]: 'POST'
} as const;

// Request settings
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000, // 1 second
  POLL_INTERVAL: 2000, // 2 seconds for status polling
  MAX_POLL_ATTEMPTS: 10, // 1 minute maximum
} as const;

// Task statuses
export const TASK_STATUS = {
  GENERATE: {
    NEW: 'new',
    INITIALIZING: 'initializing',
    INITIALIZED: 'initialized',
    GENERATING: 'generating',
    GENERATED: 'generated',
    TESTING: 'testing',
    TESTED: 'tested',
    DEPLOYING: 'generate_deploying',
    DEPLOYED: 'generate_deployed',
    ERROR: 'error',
  },
  AUDIT: {
    NEW: 'audit_new',
    AUDITING: 'auditing',
    AUDITED: 'audited',
    ERROR: 'audit_error',
  },
  BUILD: {
    NEW: 'build_new',
    BUILDING: 'building',
    BUILT: 'built',
    ERROR: 'build_error',
  },
  DEPLOY: {
    NEW: 'deploy_new',
    DEPLOYING: 'deploying',
    DEPLOYED: 'deployed',
    ERROR: 'deploy_error',
  },
} as const;

// Check if status is completed
export const isTaskCompleted = (status: string, taskType: 'generate' | 'audit' | 'build' | 'deploy'): boolean => {
  switch (taskType) {
    case 'generate':
      return status === TASK_STATUS.GENERATE.GENERATED || status === TASK_STATUS.GENERATE.DEPLOYED;
    case 'audit':
      return status === TASK_STATUS.AUDIT.AUDITED;
    case 'build':
      return status === TASK_STATUS.BUILD.BUILT;
    case 'deploy':
      return status === TASK_STATUS.DEPLOY.DEPLOYED;
    default:
      return false;
  }
};

// Check if status is error
export const isTaskError = (status: string): boolean => {
  return status === TASK_STATUS.GENERATE.ERROR || 
         status === TASK_STATUS.AUDIT.ERROR || 
         status === TASK_STATUS.BUILD.ERROR ||
         status === TASK_STATUS.DEPLOY.ERROR;
};

// Get human-readable status
export const getStatusDisplayName = (status: string): string => {
  const statusMap: Record<string, string> = {
    // Generate statuses
    [TASK_STATUS.GENERATE.NEW]: 'New',
    [TASK_STATUS.GENERATE.INITIALIZING]: 'Initializing',
    [TASK_STATUS.GENERATE.INITIALIZED]: 'Initialized',
    [TASK_STATUS.GENERATE.GENERATING]: 'Generating',
    [TASK_STATUS.GENERATE.GENERATED]: 'Generated',
    [TASK_STATUS.GENERATE.TESTING]: 'Testing',
    [TASK_STATUS.GENERATE.TESTED]: 'Tested',
    [TASK_STATUS.GENERATE.DEPLOYING]: 'Generate Deploying',
    [TASK_STATUS.GENERATE.DEPLOYED]: 'Generate Deployed',
    [TASK_STATUS.GENERATE.ERROR]: 'Error',
    
    // Audit statuses
    [TASK_STATUS.AUDIT.NEW]: 'Audit New',
    [TASK_STATUS.AUDIT.AUDITING]: 'Auditing',
    [TASK_STATUS.AUDIT.AUDITED]: 'Audited',
    [TASK_STATUS.AUDIT.ERROR]: 'Audit Error',
    
    // Build statuses
    [TASK_STATUS.BUILD.NEW]: 'Build New',
    [TASK_STATUS.BUILD.BUILDING]: 'Building',
    [TASK_STATUS.BUILD.BUILT]: 'Built',
    [TASK_STATUS.BUILD.ERROR]: 'Build Error',
    
    // Deploy statuses
    [TASK_STATUS.DEPLOY.NEW]: 'Deploy New',
    [TASK_STATUS.DEPLOY.DEPLOYING]: 'Deploy Deploying',
    [TASK_STATUS.DEPLOY.DEPLOYED]: 'Deploy Deployed',
    [TASK_STATUS.DEPLOY.ERROR]: 'Deploy Error',
  };

  return statusMap[status] || status;
};

// Get progress from status
export const getProgressFromStatus = (status: string): { stage: string; progress: number; message: string } => {
  const statusMap: Record<string, { stage: string; progress: number; message: string }> = {
    // Generate statuses
    'new': { stage: 'initializing', progress: 10, message: 'Initializing...' },
    'initializing': { stage: 'initializing', progress: 30, message: 'Setting up environment...' },
    'generating': { stage: 'generating', progress: 60, message: 'Generating smart contract...' },
    'generated': { stage: 'completed', progress: 100, message: 'Contract generated successfully!' },
    'testing': { stage: 'testing', progress: 80, message: 'Running tests...' },
    'tested': { stage: 'deploying', progress: 90, message: 'Preparing for deployment...' },
    'deploying': { stage: 'deploying', progress: 95, message: 'Deploying to network...' },
    'deployed': { stage: 'completed', progress: 100, message: 'Contract deployed successfully!' },
    'error': { stage: 'error', progress: 0, message: 'Generation failed' },
    
    // Audit statuses
    'auditing': { stage: 'generating', progress: 50, message: 'Analyzing code...' },
    'audited': { stage: 'completed', progress: 100, message: 'Audit completed!' },
    
    // Build statuses
    'building': { stage: 'generating', progress: 50, message: 'Building contract...' },
    'built': { stage: 'completed', progress: 100, message: 'Build completed!' },
    
    // Deploy statuses
    'deploy_deploying': { stage: 'deploying', progress: 50, message: 'Deploying contract...' },
    'deploy_deployed': { stage: 'completed', progress: 100, message: 'Deployment completed!' },
  };

  return statusMap[status] || { stage: 'initializing', progress: 0, message: 'Processing...' };
};

export default API_BASE_URL;

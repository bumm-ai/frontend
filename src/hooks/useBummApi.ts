import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  apiClient, 
  BummProject, 
  BummGenerateRequest, 
  TaskStatus,
  isTaskCompleted,
  isTaskError,
  getStatusDisplayName
} from '@/lib/api';
import { bummService, userService } from '@/services/bummService';
import { mockApiClient } from '@/lib/mockApi';
import { Project, ChatMessage, GenerationProgress, User } from '@/types/dashboard';

export const useBummApi = () => {
  const { publicKey, connected } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Flag for switching between real and mock API
  const [useMockApi, setUseMockApi] = useState(false); // Start with real API
  
  // Function for switching to Mock API on errors
  const fallbackToMock = useCallback(() => {
    console.warn('🔄 Falling back to Mock API due to errors');
    setUseMockApi(true);
    // Clear userId when switching to Mock API
    apiClient.setUserId('');
  }, []);

  // Function to determine if we need to switch to Mock API
  const shouldFallbackToMock = useCallback((error: unknown, operationName: string): boolean => {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Critical errors requiring fallback to Mock API
      const criticalErrors = [
        'network error',
        'connection refused',
        'timeout',
        'cors',
        'unauthorized',
        'forbidden',
        'internal server error',
        'service unavailable'
      ];
      
      // For user creation and project loading operations - stricter rules
      if (operationName.includes('create wallet') || operationName.includes('load projects')) {
        return criticalErrors.some(criticalError => errorMessage.includes(criticalError));
      }
      
      // For generation operations - only very critical errors
      if (operationName.includes('generate') || operationName.includes('audit') || operationName.includes('build')) {
        return criticalErrors.some(criticalError => errorMessage.includes(criticalError));
      }
      
      // For other operations - standard rules
      return criticalErrors.some(criticalError => errorMessage.includes(criticalError));
    }
    
    return false;
  }, []);

  // Universal function for API calls with fallback
  const apiCall = useCallback(async <T>(
    realApiCall: () => Promise<T>,
    mockApiCall: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    if (useMockApi) {
      return await mockApiCall();
    }

    try {
      return await realApiCall();
    } catch (err) {
      // Check if error is critical for fallback
      const shouldFallback = shouldFallbackToMock(err, operationName);
      
      if (shouldFallback) {
        console.error(`Critical error in ${operationName}, falling back to mock:`, err);
        fallbackToMock();
        return await mockApiCall();
      } else {
        console.warn(`Non-critical error in ${operationName}, retrying with real API:`, err);
        throw err; // Re-throw error for retry
      }
    }
  }, [useMockApi, fallbackToMock, shouldFallbackToMock]);

  // Special function for status tracking without fallback to Mock API
  const statusApiCall = useCallback(async <T>(
    realApiCall: () => Promise<T>,
    mockApiCall: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    if (useMockApi) {
      return await mockApiCall();
    }

    try {
      return await realApiCall();
    } catch (err) {
      // For status requests don't do fallback to Mock API
      // Just re-throw error
      throw err;
    }
  }, [useMockApi]);
  
  // User initialization
  const initializeUser = useCallback(async () => {
    if (!publicKey) {
      console.log(`No publicKey available for user initialization`);
      return;
    }

    try {
      console.log(`Starting user initialization...`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`PublicKey: ${publicKey.toString()}`);
      console.log(`Use Mock API: ${useMockApi}`);
      setIsLoading(true);
      setError(null);

      // Create or get user
      const walletAddress = publicKey.toString();
      console.log(`👛 Creating wallet for address: ${walletAddress}`);
      const response = await apiCall(
        () => userService.createWallet(walletAddress),
        () => mockApiClient.createWallet({ wallet: walletAddress }),
        'create wallet'
      );
      
      const newUser: User = {
        uid: response.uid,
        wallet: walletAddress,
      };

      console.log(`User created successfully:`, newUser);
      setUser(newUser);
      
      // Save user uid for all requests
      if (!useMockApi) {
        apiClient.setUserId(response.uid);
        // Save to localStorage for persistence (client only)
        if (typeof window !== 'undefined') {
          try {
        localStorage.setItem('bumm_user_uid', response.uid);
        localStorage.setItem('bumm_user_wallet', walletAddress);
          } catch (err) {
            console.warn('localStorage not available:', err);
          }
        }
      }

      // Load user projects
      console.log(`Loading user projects...`);
      await loadProjects();
    } catch (err) {
      console.error('Failed to initialize user:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize user');
      
      // On initialization error switch to Mock API
      console.log('Switching to Mock API due to initialization error');
      setUseMockApi(true);
      
      // Create mock user
      const mockUser: User = {
        uid: `mock_${Date.now()}`,
        wallet: publicKey.toString(),
      };
      setUser(mockUser);
      
      // Load mock projects
      try {
        await loadProjects();
      } catch (loadErr) {
        console.error('Failed to load mock projects:', loadErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, apiCall, useMockApi]);

  // User initialization при подключении кошелька
  useEffect(() => {
    console.log(`🔌 Wallet Connection Status:`, { connected, publicKey: publicKey?.toString() });
    if (connected && publicKey) {
      console.log(`Initializing user with wallet: ${publicKey.toString()}`);
      
      // Check if there's saved uid for this wallet (client only)
      let savedWallet = null;
      let savedUid = null;
      
      if (typeof window !== 'undefined') {
        try {
          savedWallet = localStorage.getItem('bumm_user_wallet');
          savedUid = localStorage.getItem('bumm_user_uid');
        } catch (err) {
          console.warn('localStorage not available:', err);
        }
      }
      
      if (savedWallet === publicKey.toString() && savedUid && !useMockApi) {
        console.log(`🔄 Restoring user from localStorage: ${savedUid}`);
        const restoredUser: User = {
          uid: savedUid,
          wallet: publicKey.toString(),
        };
        setUser(restoredUser);
        apiClient.setUserId(savedUid);
        loadProjects();
      } else {
        initializeUser();
      }
    } else {
      console.log(`🔌 Wallet disconnected, clearing user data`);
      setUser(null);
      setProjects([]);
      if (!useMockApi && typeof window !== 'undefined') {
        try {
        localStorage.removeItem('bumm_user_uid');
        localStorage.removeItem('bumm_user_wallet');
        } catch (err) {
          console.warn('localStorage not available:', err);
        }
      }
    }
  }, [connected, publicKey, initializeUser, useMockApi]);

  // Load projects
  const loadProjects = async () => {
    if (!user && !useMockApi) {
      console.log(`No user available, skipping project load`);
      return;
    }

    try {
      console.log(`Loading projects for user: ${user?.uid || 'mock'}`);
      setIsLoading(true);
      const response = await apiCall(
        () => bummService.getBummList({ limit: 50 }),
        () => mockApiClient.getBumms({ limit: 50 }),
        'load projects'
      );
      
      const formattedProjects: Project[] = response.bumms.map((bumm: BummProject) => ({
        uid: bumm.uid,
        name: bumm.name,
        status: bumm.status as Project['status'],
        created_at: bumm.created_at,
        updated_at: bumm.updated_at,
        task: bumm.task,
        description: bumm.name || 'Untitled Project',
        isDeployed: bumm.status === 'deployed',
        isFrozen: false, // API field will be added
      }));

      console.log(`Loaded ${formattedProjects.length} projects:`, formattedProjects);
      setProjects(formattedProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  // Smart contract generation
  const generateContract = async (description: string): Promise<Project> => {
    try {
      console.log(`Starting contract generation: "${description}"`);
      console.log(`Current environment: ${process.env.NODE_ENV}`);
      console.log(`Use Mock API: ${useMockApi}`);
      console.log(`Current user:`, user);
      setIsLoading(true);
      setError(null);

      // Check if we need to use Mock API
      let response;
      if (useMockApi) {
        console.log(`Using Mock API for generation (already in Mock mode)`);
        response = await mockApiClient.generateContract({ text: description });
        console.log(`Mock API generation successful:`, response);
      } else {
        // Force use real API for generation
        try {
          console.log(`Attempting real API generation...`);
        response = await bummService.generateBumm(description);
          console.log(`Real API generation successful:`, response);
      } catch (err) {
          console.error(`Real API generation failed:`, err);
          console.error(`Error details:`, {
            message: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
            name: err instanceof Error ? err.name : undefined
          });
          
          // Check if we need to switch to Mock API
        if (shouldFallbackToMock(err, 'generate contract')) {
            console.warn(`Falling back to Mock API for generation`);
          fallbackToMock();
          response = await mockApiClient.generateContract({ text: description });
            console.log(`Mock API generation successful:`, response);
        } else {
            // If not critical error, re-throw it
          throw err;
          }
        }
      }

      const newProject: Project = {
        uid: response.uid,
        name: null,
        status: 'in-progress', // Generation in progress
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task: 'generate',
        description,
        isDeployed: false,
        isFrozen: false,
      };

      console.log(`Contract generation started - created project: ${newProject.uid}`);
      
      // If contract code was returned, save it to localStorage
      if (response.code) {
        console.log(`Saving contract code to localStorage`);
        if (typeof window !== 'undefined') {
          try {
        localStorage.setItem(`bumm_contract_code_${newProject.uid}`, response.code);
          } catch (err) {
            console.warn('localStorage not available:', err);
          }
        }
      } else {
        console.log(`No contract code returned from backend. Status: ${response.status}`);
      }
      
      console.log(`Adding project to list:`, newProject);
      console.log(`Current projects before update:`, projects);
      setProjects(prev => {
        const updated = [newProject, ...prev];
        console.log(`Updated projects list:`, updated);
        console.log(`Projects count: ${updated.length}`);
        return updated;
      });
      
      // Check that project was actually added
      setTimeout(() => {
        console.log(`Projects after timeout:`, projects);
      }, 100);
      
      return newProject;
    } catch (err) {
      console.error('Failed to generate contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate contract');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Contract generation in existing project
  const generateInProject = async (projectUid: string, description: string): Promise<void> => {
    try {
      console.log(`Starting contract generation in existing project: ${projectUid}`);
      console.log(`📝 Description: ${description}`);
      setIsLoading(true);
      setError(null);

      // Force use real API for generation
      let response;
      try {
        console.log(`Attempting real API generation in project...`);
        response = await bummService.generateBumm(description);
        console.log(`Real API generation in project successful:`, response);
      } catch (err) {
        console.error(`Real API generation in project failed:`, err);
        
        // Check if we need to switch to Mock API
        if (shouldFallbackToMock(err, 'generate contract in project')) {
          console.warn(`Falling back to Mock API for project generation`);
          fallbackToMock();
          response = await mockApiClient.generateContract({ text: description });
        } else {
          // If not critical error, re-throw it
          throw err;
        }
      }

      // If contract code was returned, save it to localStorage
      if (response.code) {
        console.log(`💾 Saving contract code to localStorage for project: ${projectUid}`);
        localStorage.setItem(`bumm_contract_code_${projectUid}`, response.code);
      } else {
        console.log(`No contract code returned from backend for project ${projectUid}. Status: ${response.status}`);
      }

      // Update existing project instead of creating new one
      setProjects(prev => prev.map(project => 
        project.uid === projectUid 
          ? {
              ...project,
              status: 'in-progress',
              task: 'generate',
              description,
              updated_at: new Date().toISOString()
            }
          : project
      ));

      console.log(`Contract generation started in project: ${projectUid}`);
    } catch (err) {
      console.error('Failed to generate contract in project:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate contract');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Contract audit
  const auditContract = async (code: string): Promise<Project> => {
    if (!user) {
      throw new Error('User not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiCall(
        () => bummService.auditBumm(code),
        () => mockApiClient.auditContract({ text: code }),
        'audit contract'
      );

      const newProject: Project = {
        uid: response.uid,
        name: null,
        status: response.status as Project['status'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task: 'audit',
        description: 'Code Audit',
        code,
        isDeployed: false,
        isFrozen: false,
      };

      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      console.error('Failed to audit contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to audit contract');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Contract build (updates existing project)
  const buildContract = async (code: string, projectUid?: string): Promise<Project> => {
    if (!user) {
      throw new Error('User not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiCall(
        () => bummService.buildBumm(code),
        () => mockApiClient.buildContract({ text: code }),
        'build contract'
      );

      if (projectUid) {
        // Update existing project
        const updatedProject = projects.find(p => p.uid === projectUid);
        if (updatedProject) {
          const updated = {
            ...updatedProject,
            status: 'built' as const,
            task: 'build' as const,
            code,
            updated_at: new Date().toISOString()
          };
          
          setProjects(prev => prev.map(p => p.uid === projectUid ? updated : p));
          return updated;
        }
      }

      // Create new project only if existing one not found
      const newProject: Project = {
        uid: response.uid,
        name: null,
        status: 'built',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task: 'build',
        description: 'Contract Build',
        code,
        isDeployed: false,
        isFrozen: false,
      };

      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      console.error('Failed to build contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to build contract');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Contract deployment
  const deployContract = async (code: string): Promise<string> => {
    if (!user) {
      throw new Error('User not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const contractAddress = await apiCall(
        () => bummService.deployBumm(code),
        () => mockApiClient.deployContract({ text: code }),
        'deploy contract'
      );
      
      return contractAddress;
    } catch (err) {
      console.error('Failed to deploy contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to deploy contract');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Task status tracking
  const trackTaskStatus = useCallback(async (
    projectUid: string, 
    taskType: 'generate' | 'audit' | 'build',
    onProgress?: (progress: GenerationProgress) => void,
    onComplete?: (result: unknown) => void,
    onError?: (error: string) => void
  ) => {
    const pollInterval = 5000; // 5 секунд
    const maxAttempts = 10; // 1 минута максимум
    let attempts = 0;
    let lastStatus = '';

    // Add small delay before starting tracking
    // to give time for task to be created on server
    const initialDelay = 5000; // 5 секунд
    console.log(`⏳ Waiting ${initialDelay}ms before starting status tracking for ${taskType}...`);
    
    setTimeout(() => {
      pollStatus();
    }, initialDelay);

    const pollStatus = async (): Promise<void> => {
      try {
        let statusResponse;
        
        // Force use real API for status tracking
        try {
          switch (taskType) {
            case 'generate':
              statusResponse = await bummService.getGenerationStatus(projectUid);
              break;
            case 'audit':
              statusResponse = await bummService.getAuditStatus(projectUid);
              break;
            case 'build':
              statusResponse = await bummService.getBuildStatus(projectUid);
              break;
          }
          console.log(`Real API status check successful for ${taskType}:`, statusResponse);
        } catch (err) {
          console.error(`Real API status check failed for ${taskType}:`, err);
          
          // Only for critical errors switch to Mock API
          if (shouldFallbackToMock(err, `get ${taskType} status`)) {
            console.warn(`Falling back to Mock API for status tracking`);
            fallbackToMock();
        
        switch (taskType) {
          case 'generate':
                statusResponse = await mockApiClient.getGenerateStatus(projectUid);
            break;
          case 'audit':
                statusResponse = await mockApiClient.getAuditStatus(projectUid);
            break;
          case 'build':
                statusResponse = await mockApiClient.getBuildStatus(projectUid);
            break;
            }
          } else {
            // If not critical error, re-throw it
            throw err;
          }
        }

        if (statusResponse) {
          const status = statusResponse.status;
          
          // Log status changes
          if (status !== lastStatus) {
            console.log(`Status changed for ${taskType}: ${lastStatus} → ${status}`);
            lastStatus = status;
          }
          
          // Update project in list
          setProjects(prev => prev.map(project => 
            project.uid === projectUid 
              ? { ...project, status: status as Project['status'], updated_at: new Date().toISOString() }
              : project
          ));

          // Check for error
          if (isTaskError(status)) {
            console.error(`Task ${taskType} failed with status: ${status}`);
            onError?.(`Task failed with status: ${getStatusDisplayName(status)}`);
            return;
          }

          // Send progress
          const progress = getProgressFromStatus(status);
          onProgress?.(progress);

          // Check for completion
          if (isTaskCompleted(status, taskType)) {
            console.log(`Task ${taskType} completed with status: ${status}`);
            onComplete?.(statusResponse);
            return;
          }
          
          // If status remains 'new' too long, this might indicate backend problem
          if (status === 'new' && attempts > 10) {
            console.warn(`Task ${taskType} has been in 'new' status for ${attempts} attempts. This might indicate a backend issue.`);
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Polling ${taskType} status... (attempt ${attempts}/${maxAttempts})`);
          setTimeout(pollStatus, pollInterval);
        } else {
          console.error(`Task ${taskType} timeout after ${maxAttempts} attempts`);
          onError?.('Task timeout - maximum attempts reached');
        }
      } catch (err) {
        console.error(`Error polling ${taskType} status:`, err);
        
        // If this is 404 error, task is not created yet
        if (err instanceof Error && err.message.includes('Not Found')) {
          console.log(`Task ${taskType} for project ${projectUid} not found yet, retrying... (attempt ${attempts + 1}/${maxAttempts})`);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(pollStatus, pollInterval);
          } else {
            console.warn(`Task ${taskType} for project ${projectUid} not found after ${maxAttempts} attempts`);
            onError?.('Task not found after maximum attempts');
          }
          return;
        }
        
        // For other errors also try to retry several times
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Retrying ${taskType} status check after error... (attempt ${attempts}/${maxAttempts})`);
          setTimeout(pollStatus, pollInterval);
        } else {
          console.error(`Task ${taskType} failed after ${maxAttempts} attempts due to errors`);
        onError?.(err instanceof Error ? err.message : 'Failed to poll status');
        }
      }
    };

    pollStatus();
  }, [shouldFallbackToMock, fallbackToMock]);

  // Get progress from status
  const getProgressFromStatus = (status: string): GenerationProgress => {
    const statusMap: Record<string, GenerationProgress> = {
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
    };

    return statusMap[status] || { stage: 'initializing', progress: 0, message: 'Processing...' };
  };

  const createProject = useCallback(async (projectName: string) => {
    if (!user?.uid) {
      throw new Error('User must be initialized to create project');
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🆕 Creating new project: ${projectName}`);
      
      const newProject: Project = {
        uid: `project_${Date.now()}`,
        name: projectName,
        description: `New smart contract project`,
        status: 'draft' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task: null,
        isDeployed: false,
        isFrozen: false
      };

      // In real application this will be API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProjects(prevProjects => [newProject, ...prevProjects]);
      
      console.log(`Project created:`, newProject);
      return newProject;
    } catch (err) {
      console.error(`Failed to create project:`, err);
      setError('Failed to create project');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateProjects = useCallback((updater: (projects: Project[]) => Project[]) => {
    setProjects(updater);
  }, []);

  return {
    user,
    projects,
    isLoading,
    error,
    generateContract,
    generateInProject,
    auditContract,
    buildContract,
    deployContract,
    trackTaskStatus,
    loadProjects,
    initializeUser,
    createProject,
    updateProjects,
    useMockApi, // Export for debugging
  };
};

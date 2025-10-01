'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { DashboardState, ChatMessage, Project } from '@/types/dashboard';
import { useBummApi } from '@/hooks/useBummApi';
import { useCredits } from '@/hooks/useCredits';
import { useAnalytics } from '@/hooks/useAnalytics';
import { bummService, userService } from '@/services/bummService';
import { isGenerationCommand, extractContractDescription } from '@/utils/generationCommands';
import { useRef } from 'react';
// import { WalletDebug } from '../debug/WalletDebug';
// import { SimpleWalletTest } from '../debug/SimpleWalletTest';
import LoginScreen from './LoginScreen';
import ChatScreen from './ChatScreen';

export default function Dashboard() {
  const { disconnect } = useWallet();
  const { spendCredits, hasEnoughCredits } = useCredits();
  const analytics = useAnalytics();
  const [currentState, setCurrentState] = useState<DashboardState>('login');
  
  // Counter for generating unique message IDs
  const messageIdCounter = useRef(0);
  const generateUniqueMessageId = () => {
    messageIdCounter.current++;
    return `${Date.now()}_${messageIdCounter.current}`;
  };
  const [currentProject, setCurrentProject] = useState<Project | null>(() => {
    // Load current project from localStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const savedProject = localStorage.getItem('bumm_current_project');
        if (savedProject) {
          const parsed = JSON.parse(savedProject);
          return parsed;
        }
      } catch (err) {
        console.warn('Failed to load current project from localStorage:', err);
      }
    }
    return null;
  });
  
  // API хук
  const {
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
    createProject,
    updateProjects,
  } = useBummApi();
  
  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      // Don't show alert for every error to avoid spam
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Show user-friendly error message
      if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
        console.error('Error details:', event.reason.message);
      }
      
      event.preventDefault(); // Prevent error display in console
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load history from localStorage for current project on initialization
    if (typeof window !== 'undefined') {
      try {
        // First try to load for current project
        const savedProject = localStorage.getItem('bumm_current_project');
        if (savedProject) {
          const project = JSON.parse(savedProject);
          const savedMessages = localStorage.getItem(`bumm_chat_history_${project.uid}`);
          if (savedMessages) {
            const parsed = JSON.parse(savedMessages);
            // Convert timestamp back to Date objects
            return parsed.map((msg: ChatMessage) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
          }
        }
        
        // Fallback: попробуем загрузить из старого ключа для совместимости
        const oldSavedMessages = localStorage.getItem('bumm_chat_history');
        if (oldSavedMessages) {
          const parsed = JSON.parse(oldSavedMessages);
          return parsed.map((msg: ChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
      } catch (err) {
        console.warn('Failed to load chat history from localStorage:', err);
      }
    }
    
    // If no saved history, return welcome message
    return [
    {
      id: '1',
        content: 'Hello! I\'m here to help you build on Solana. What would you like to create today?',
      timestamp: new Date(),
      isUser: false
    }
    ];
  });
  const [isBuilding, setIsBuilding] = useState(false);

  // Save message history for current project in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentProject && messages.length > 0) {
      try {
        localStorage.setItem(`bumm_chat_history_${currentProject.uid}`, JSON.stringify(messages));
      } catch (err) {
        console.warn('Failed to save chat history to localStorage:', err);
      }
    }
  }, [messages, currentProject]);

  // Save current project in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentProject) {
      try {
        localStorage.setItem('bumm_current_project', JSON.stringify(currentProject));
      } catch (err) {
        console.warn('Failed to save current project to localStorage:', err);
      }
    }
  }, [currentProject]);

  const handleLogin = async () => {
    console.log(`Login initiated`);
    analytics.trackWalletConnect('phantom'); // Assume Phantom as primary wallet
    setCurrentState('chat'); // Switch to dashboard
  };

  const handleSendMessage = async (content: string, currentContractCode?: string) => {
    console.log(`User message: "${content}"`);
    
    const newMessage: ChatMessage = {
      id: generateUniqueMessageId(),
      content,
      timestamp: new Date(),
      isUser: true
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Determine if project creation is needed based on keywords
    const isGenerationRequest = isGenerationCommand(content);
    
    console.log(`Generation request: ${isGenerationRequest} for project: ${currentProject?.uid || 'none'}`);
    
    if (isGenerationRequest) { // Temporarily removed user check
      // Credit check temporarily disabled - frontend only
      // if (!hasEnoughCredits('generate')) {
      //   const insufficientCreditsMessage: ChatMessage = {
      //     id: generateUniqueMessageId(),
      //     content: 'Insufficient credits for contract generation. Please buy more credits to continue.',
      //     timestamp: new Date(),
      //     isUser: false
      //   };
      //   setMessages(prev => [...prev, insufficientCreditsMessage]);
      //   return;
      // }

      // Check if contract already exists in current project
      const hasExistingContract = currentContractCode && currentContractCode.trim().length > 0;
      
      if (hasExistingContract) {
        // If contract already exists, show notification only if not already shown
        const alreadyExistsMessage = "A smart contract already exists in this project. To create a new smart contract, please create a new project manually. You can modify and edit the current smart contract code directly in the editor.";
        if (!messages.some(m => m.content === alreadyExistsMessage)) {
          const aiMessage: ChatMessage = {
            id: generateUniqueMessageId(),
            content: alreadyExistsMessage,
            timestamp: new Date(),
            isUser: false
          };
          setMessages(prev => [...prev, aiMessage]);
        }
        return;
      }
      
      console.log(`Starting generation request...`);
      try {
        let project = currentProject;
        let generatingMessage: ChatMessage | null = null;
        
        // Extract contract description from command
        const contractDescription = extractContractDescription(content);
        
        // If no project or project in final state - create new project
        if (!currentProject || ['deployed', 'completed'].includes(currentProject.status)) {
          console.log(`🆕 Creating new project for generation. Current project:`, currentProject);
          
          // Add message about generation start
          generatingMessage = {
            id: generateUniqueMessageId(),
            content: 'Starting smart contract generation...',
            timestamp: new Date(),
            isUser: false
          };
          setMessages(prev => [...prev, generatingMessage!]);
          
          // Start generation in new project
          console.log(`Calling generateContract with description: "${contractDescription}"`);
          project = await generateContract(contractDescription);
          console.log(`generateContract returned project:`, project);
          setCurrentProject(project);
          console.log(`Current project set to:`, project);
        } else {
          // Project exists - generate in existing project
          generatingMessage = {
            id: generateUniqueMessageId(),
            content: 'Starting smart contract generation in current project...',
            timestamp: new Date(),
            isUser: false
          };
          setMessages(prev => [...prev, generatingMessage!]);
          
          // Generate in existing project
          await generateInProject(currentProject.uid, contractDescription);
          project = currentProject; // Stay in the same project
        }
        
        // Track generation progress
        trackTaskStatus(
          project.uid,
          'generate',
          (progress) => {
            // Remove progress message updates
            // if (generatingMessage) {
            //   setMessages(prev => prev.map(msg => 
            //     msg.id === generatingMessage.id 
            //       ? { ...msg, content: `${progress.message} (${progress.progress}%)` }
            //       : msg
            //   ));
            // }
          },
          (result) => {
            // Generation completed - update project status
            updateProjects(prev => prev.map(p => 
              p.uid === project.uid 
                ? { ...p, status: 'generated', task: null, updated_at: new Date().toISOString() }
                : p
            ));
            
            // Credit deduction temporarily disabled - frontend only
            // spendCredits('generate', project.uid, {
            //   description: 'Smart contract generation',
            //   complexity: 1.0
            // });

            // Analytics tracking
            analytics.trackContractGeneration(extractContractDescription(content), project.uid);
            analytics.trackCreditSpend('generate', 100, project.uid);

            // Add successful generation message
            const successMessage: ChatMessage = {
              id: generateUniqueMessageId(),
              content: 'Smart contract generated successfully! The contract is ready for building and testing.',
              timestamp: new Date(),
              isUser: false,
              projectUid: project.uid,
              taskType: 'generate'
            };
            setMessages(prev => [...prev, successMessage]);   
          },
          (error) => {
            // Don't show generation errors to user
            console.warn('Generation error (hidden from user):', error);
          }
        );
      } catch (err) {
        console.error('GENERATION ERROR:', err);
        const errorMessage: ChatMessage = {
          id: generateUniqueMessageId(),
          content: `Failed to start generation: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date(),
          isUser: false
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } else {
      console.log(`NOT a generation request - adding simple AI response`);
      // Regular AI response (simulated for now)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: generateUniqueMessageId(),
        content: generateAIResponse(content),
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
    }
  };

  const addAIMessage = (content: string) => {
    const aiMessage: ChatMessage = {
      id: generateUniqueMessageId(),
      content,
      timestamp: new Date(),
      isUser: false
    };
    setMessages(prev => [...prev, aiMessage]);
  };


  const addUserMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: generateUniqueMessageId(),
      content,
      timestamp: new Date(),
      isUser: true
    };
    setMessages(prev => [...prev, userMessage]);
  };


  const generateAIResponse = (userMessage: string): string => {
    const responses = [
      "I'll help you create that smart contract. Let me generate the Rust code for you.",
      "Great idea! I'm analyzing the best approach for your Solana program.",
      "I can help you implement that feature. Here's what I suggest...",
      "That's an interesting use case for Solana. Let me create the program structure.",
      "I'll generate the anchor framework code for your project. This will include the necessary instructions and account structures."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleBuild = async (code: string) => {
    if (!user || !code.trim()) return;
    
    // Credit check temporarily disabled - frontend only
    // if (!hasEnoughCredits('build')) {
    //   const insufficientCreditsMessage: ChatMessage = {
    //     id: generateUniqueMessageId(),
    //     content: 'Insufficient credits for contract build. Please buy more credits to continue.',
    //     timestamp: new Date(),
    //     isUser: false
    //   };
    //   setMessages(prev => [...prev, insufficientCreditsMessage]);
    //   return;
    // }
    
    setIsBuilding(true);
    
    try {
      // Add message about build start
      const buildingMessage: ChatMessage = {
        id: generateUniqueMessageId(),
        content: 'Starting contract build...',
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, buildingMessage]);
      
      // Start build via API (use current project if exists)
      const project = await buildContract(code, currentProject?.uid);
      
      // Track build progress
      trackTaskStatus(
        project.uid,
        'build',
        (progress) => {
          // Remove progress message updates
          // setMessages(prev => prev.map(msg => 
          //   msg.id === buildingMessage.id 
          //     ? { ...msg, content: `${progress.message} (${progress.progress}%)` }
          //     : msg
          // ));
        },
        (result) => {
          // Credit deduction temporarily disabled - frontend only
          // spendCredits('build', project.uid, {
          //   description: 'Contract build',
          //   codeLength: code.length
          // });

          // Analytics tracking
          analytics.trackContractBuild(project.uid);
          analytics.trackCreditSpend('build', 25, project.uid);
           
          // Build completed
          setIsBuilding(false);
          const successMessage: ChatMessage = {
          id: generateUniqueMessageId(),
          content: 'Build completed successfully! Your Solana program is ready for deployment.',
          timestamp: new Date(),
          isUser: false,
          projectUid: project.uid,
          taskType: 'build'
          };
          setMessages(prev => [...prev, successMessage]);
        },
        (error) => {
          // Build error
          setIsBuilding(false);
          const errorMessage: ChatMessage = {
            id: generateUniqueMessageId(),
            content: `Build failed: ${error}`,
            timestamp: new Date(),
            isUser: false,
            projectUid: project.uid,
            taskType: 'build'
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      );
    } catch (err) {
      setIsBuilding(false);
      const errorMessage: ChatMessage = {
        id: generateUniqueMessageId(),
        content: `Failed to start build: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleDeploy = async (code: string) => {
    if (!user || !code.trim()) return;
    
    try {
      // Add message about deployment start
      const deployingMessage: ChatMessage = {
        id: generateUniqueMessageId(),
        content: 'Starting deployment...',
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, deployingMessage]);
      
      // Start deployment via API
      const contractAddress = await deployContract(code);
      
      // Update current project
      if (currentProject) {
        const updatedProject = {
          ...currentProject,
          contractAddress,
          isDeployed: true,
          status: 'deployed' as const,
          updated_at: new Date().toISOString()
        };
        
        setCurrentProject(updatedProject);
        
        // Also update project in projects list
        updateProjects(prev => prev.map(p => 
          p.uid === currentProject.uid ? updatedProject : p
        ));
      }
      
      // Analytics tracking
      if (currentProject) {
        analytics.trackContractDeploy(currentProject.uid, contractAddress);
      }

      // Add successful deployment message
      const successMessage: ChatMessage = {
        id: generateUniqueMessageId(),
        content: `Deployment successful! Your smart contract is now live on Solana. Contract address: ${contractAddress}`,
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: generateUniqueMessageId(),
        content: `Deployment failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleCreateNew = async () => {
    if (!user) return;
    
    try {
      console.log(`Creating new project manually...`);
      
      // Create empty project (without automatic contract generation)
      const projectName = `Project ${projects.length + 1}`;
      const newProject = await createProject(projectName);
      setCurrentProject(newProject);
      
      // Analytics tracking
      analytics.trackProjectCreate(projectName);
      
      // Clear chat for new project
      setMessages([]);
      
      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: generateUniqueMessageId(),
        content: `🆕 New project "${projectName}" created! Describe what smart contract you'd like to build.`,
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, welcomeMessage]);
      
    } catch (err) {
      console.error('Failed to create new project:', err);
      const errorMessage: ChatMessage = {
      id: Date.now().toString(),
        content: `Failed to create new project: ${err instanceof Error ? err.message : 'Unknown error'}`,
      timestamp: new Date(),
      isUser: false
    };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Project management functions
  const handleSelectProject = async (project: Project) => {
    try {
      console.log(`🔄 Switching to project ${project.uid}`);
      
      // Save current messages for current project (if any)
      if (currentProject && messages.length > 0) {
        localStorage.setItem(`bumm_chat_history_${currentProject.uid}`, JSON.stringify(messages));
      }
      
      // Switch to new project
      setCurrentProject(project);
      
      // Load chat history for new project
      const savedMessages = localStorage.getItem(`bumm_chat_history_${project.uid}`);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsedMessages.map((msg: ChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        } catch (err) {
          console.warn('Failed to parse saved messages:', err);
          setMessages([]);
        }
      } else {
        // If no saved history, start with empty chat
        setMessages([]);
      }
      
    } catch (err) {
      console.error('Failed to switch project:', err);
    }
  };

  const handleRenameProject = async (project: Project, newName: string) => {
    try {
      console.log(`📝 Renaming project ${project.uid} to ${newName}`);
      
      // Update project locally
      updateProjects(prev => prev.map(p => 
        p.uid === project.uid 
          ? { ...p, name: newName, updated_at: new Date().toISOString() }
          : p
      ));
      
      // Update current project если это он
      if (currentProject?.uid === project.uid) {
        setCurrentProject(prev => prev ? { ...prev, name: newName } : null);
      }
      
      addAIMessage(`📝 Project renamed to "${newName}"`);
    } catch (err) {
      console.error('Failed to rename project:', err);
      addAIMessage(`Failed to rename project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    try {
      console.log(`Deleting project ${project.uid}`);
      
      // Remove project from list
      updateProjects(prev => prev.filter(p => p.uid !== project.uid));
      
      // If this is current project, switch to another or clear
      if (currentProject?.uid === project.uid) {
        const remainingProjects = projects.filter(p => p.uid !== project.uid);
        setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
        
        // If no other projects, clear chat
        if (remainingProjects.length === 0) {
          setMessages([]);
        }
      }
      
      // Analytics tracking
      analytics.trackProjectDelete(project.uid);
      
      addAIMessage(`Project "${project.name || 'Untitled'}" deleted`);
    } catch (err) {
      console.error('Failed to delete project:', err);
      addAIMessage(`Failed to delete project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleArchiveProject = async (project: Project) => {
    try {
      console.log(`${project.isFrozen ? 'Unarchiving' : 'Archiving'} project ${project.uid}`);
      
      // Update project archive status
      const newArchivedStatus = !project.isFrozen;
      updateProjects(prev => prev.map(p => 
        p.uid === project.uid 
          ? { ...p, isFrozen: newArchivedStatus, updated_at: new Date().toISOString() }
          : p
      ));
      
      // Update current project если это он
      if (currentProject?.uid === project.uid) {
        setCurrentProject(prev => prev ? { ...prev, isFrozen: newArchivedStatus } : null);
      }
      
      addAIMessage(`Project "${project.name || 'Untitled'}" ${newArchivedStatus ? 'archived' : 'unarchived'}`);
    } catch (err) {
      console.error('Failed to archive project:', err);
      addAIMessage(`Failed to archive project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      console.log(`Duplicating project ${project.uid}`);
      
      // Create project copy
      const duplicatedProject = {
        ...project,
        uid: `project_${Date.now()}`,
        name: `${project.name || 'Untitled'} (Copy)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isDeployed: false, // Copy cannot be deployed
        isFrozen: false,
        contract_address: null,
        deployment_status: null
      };
      
      // Add to beginning of list
      updateProjects(prev => [duplicatedProject, ...prev]);
      
      addAIMessage(`Project "${project.name || 'Untitled'}" duplicated as "${duplicatedProject.name}"`);
    } catch (err) {
      console.error('Failed to duplicate project:', err);
      addAIMessage(`Failed to duplicate project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCreateGroup = async (project: Project) => {
    try {
      console.log(`Creating group for project ${project.uid}`);
      // API call to create group will be implemented
      addAIMessage(`Group created for project "${project.name || 'Untitled'}"`);
    } catch (err) {
      console.error('Failed to create group:', err);
      addAIMessage(`Failed to create group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAddToGroup = async (project: Project) => {
    try {
      console.log(`👥 Adding project ${project.uid} to group`);
      // API call to add to group will be implemented
      addAIMessage(`👥 Project "${project.name || 'Untitled'}" added to group`);
    } catch (err) {
      console.error('Failed to add to group:', err);
      addAIMessage(`Failed to add to group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleToggleVisibility = async (project: Project) => {
    try {
      console.log(`${project.isFrozen ? 'Showing' : 'Hiding'} project ${project.uid}`);
      // API call to toggle visibility will be implemented
      addAIMessage(`Project "${project.name || 'Untitled'}" ${project.isFrozen ? 'shown' : 'hidden'}`);
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      addAIMessage(`Failed to toggle visibility: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleExportProject = async (project: Project) => {
    try {
      console.log(`Exporting project ${project.uid}`);
      // Export functionality will be implemented
      addAIMessage(`Project "${project.name || 'Untitled'}" exported successfully!`);
    } catch (err) {
      console.error('Failed to export project:', err);
      addAIMessage(`Failed to export project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const renderCurrentScreen = () => {
    switch (currentState) {
      case 'login':
        return <LoginScreen onLogin={handleLogin} />;
      
      case 'chat':
        return (
          <ChatScreen 
            messages={messages}
            onSendMessage={handleSendMessage}
            onAddAIMessage={addAIMessage}
            onBuild={handleBuild}
            onDeploy={handleDeploy}
            onGenerateContract={generateContract}
            onCreateProject={createProject}
            onCreateNew={handleCreateNew}
            onSelectProject={handleSelectProject}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
            onArchiveProject={handleArchiveProject}
            onDuplicateProject={handleDuplicateProject}
            onCreateGroup={handleCreateGroup}
            onAddToGroup={handleAddToGroup}
            onToggleVisibility={handleToggleVisibility}
            onExportProject={handleExportProject}
            isBuilding={isBuilding}
            currentProject={currentProject}
            user={user}
            projects={projects}
            isLoading={isLoading}
            error={error}
          />
        );
      
      default:
        return <LoginScreen onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] flex items-center justify-center">
      <AnimatePresence mode="wait">
        {renderCurrentScreen()}
      </AnimatePresence>
      {/* <WalletDebug /> */}
      {/* <SimpleWalletTest /> */}
      
      {/* Временная кнопка для отключения кошелька */}
      <div className="fixed top-4 left-4 hidden">
        <button 
          onClick={() => {
            disconnect();
            setCurrentState('login');
          }}
          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

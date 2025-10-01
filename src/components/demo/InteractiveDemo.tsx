'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Code, 
  Shield, 
  Rocket, 
  CheckCircle,
  Loader2,
  Bot,
  User as UserIcon,
  FolderPlus,
  Eye,
  Plus
} from 'lucide-react';
import { CodeGenerationStages } from '../ui/CodeGenerationStages';
import { BuildStages } from '../ui/BuildStages';
import { AuditStages } from '../ui/AuditStages';
import { DeployStages } from '../ui/DeployStages';
import { InteractiveCodeEditor } from '../ui/InteractiveCodeEditor';
import { useGSAPAnimations } from '@/hooks/useGSAPAnimations';
import { CodeSource } from '@/types/dashboard';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface Project {
  id: string;
  name: string;
  status: 'new' | 'generating' | 'generated' | 'auditing' | 'audited' | 'building' | 'built' | 'deploying' | 'deployed';
  description: string;
  createdAt: Date;
}

interface DemoState {
  isAutoMode: boolean;
  isPlaying: boolean;
  currentStep: number;
  userInput: string;
  messages: ChatMessage[];
  currentProject: Project | null;
  projects: Project[];
  generatedCode: string;
  isGenerating: boolean;
  isBuilding: boolean;
  isAuditing: boolean;
  isDeploying: boolean;
  isReviewing: boolean;
  credits: number;
}

const DEMO_STEPS = [
  { id: 'start', label: 'Start Demo', duration: 1000 },
  { id: 'user_message', label: 'User Input', duration: 2000 },
  { id: 'ai_processing', label: 'AI Processing', duration: 3000 },
  { id: 'code_generation', label: 'Code Generation', duration: 4000 },
  { id: 'project_created', label: 'Project Created', duration: 2000 },
  { id: 'actions_available', label: 'Actions Available', duration: 2000 }
];

  // const SAMPLE_CONTRACT_CODE = `...`; // Commented out to avoid unused variables

export default function InteractiveDemo() {
  // Function for generating unique IDs
  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // State for mobile tab
  const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'code' | 'network'>('chat');
  const [isTablet, setIsTablet] = useState(false);

  // Determine if device is tablet
  useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 800 && width <= 1200);
    };
    
    checkIsTablet();
    window.addEventListener('resize', checkIsTablet);
    return () => window.removeEventListener('resize', checkIsTablet);
  }, []);

  // State for project editing (mobile version)
  const [editingProjectName, setEditingProjectName] = useState<string>('');

  const [demoState, setDemoState] = useState<DemoState>({
    isAutoMode: true,
    isPlaying: false,
    currentStep: 0,
    userInput: '',
    messages: [],
    currentProject: null,
    projects: [],
    generatedCode: '',
    isGenerating: false,
    isBuilding: false,
    isAuditing: false,
    isDeploying: false,
    isReviewing: false,
    credits: 1000
  });

  const [isMainNet, setIsMainNet] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contractCode, setContractCode] = useState('');
  const [codeSource, setCodeSource] = useState<CodeSource>('empty');
  const [originalDeployedCode, setOriginalDeployedCode] = useState('');
  const [generationContext, setGenerationContext] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobileMessagesEndRef = useRef<HTMLDivElement>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { demoRef } = useGSAPAnimations();

  // Welcome message on component mount
  useEffect(() => {
    // Add welcome message as AI response after a short delay
    const timer = setTimeout(() => {
      addAIMessage('Hello! I can help you build on Solana — try commands like "create contract", "make gaming contract", "build DEX contract", "generate token contract", or "create NFT contract" to see the magic happen!', false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom of messages - desktop version
  useEffect(() => {
    if (demoState.messages.length > 0 && messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.closest('.overflow-y-auto') as HTMLElement;
      if (chatContainer) {
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [demoState.messages]);

  // Auto-scroll to bottom of messages - mobile version
  useEffect(() => {
    if (demoState.messages.length > 0 && mobileMessagesEndRef.current) {
      const chatContainer = mobileMessagesEndRef.current.closest('.overflow-y-auto') as HTMLElement;
      if (chatContainer) {
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [demoState.messages]);


  // Auto-play functionality
  useEffect(() => {
    if (demoState.isAutoMode && demoState.isPlaying) {
      const currentStepData = DEMO_STEPS[demoState.currentStep];
      if (currentStepData) {
        autoPlayTimeoutRef.current = setTimeout(() => {
          executeStep(demoState.currentStep);
          setDemoState(prev => ({
            ...prev,
            currentStep: (prev.currentStep + 1) % DEMO_STEPS.length
          }));
        }, currentStepData.duration);
      }
    }

    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [demoState.isAutoMode, demoState.isPlaying, demoState.currentStep]);

  const executeStep = (stepIndex: number) => {
    const step = DEMO_STEPS[stepIndex];
    if (!step) return;

    switch (step.id) {
      case 'start':
        resetDemo();
        break;
      case 'user_message':
        addUserMessage('create contract simple dex for solana');
        break;
      case 'ai_processing':
        addAIMessage('I\'ll create a simple DEX contract for Solana with basic swap functionality...', true);
        break;
      case 'code_generation':
        generateCode();
        break;
      case 'project_created':
        createProject();
        break;
      case 'actions_available':
        addAIMessage('Contract generated successfully! You can now audit, build, or deploy it.', false);
        // Add system message
        const systemMessage: ChatMessage = {
          id: generateUniqueId(),
          type: 'system',
          content: 'Smart contract generated successfully! The contract is ready for building and testing.',
          timestamp: new Date()
        };
        setDemoState(prev => ({
          ...prev,
          messages: [...prev.messages, systemMessage]
        }));
        break;
    }
  };

  const resetDemo = () => {
    setDemoState({
      isAutoMode: true,
      isPlaying: false,
      currentStep: 0,
      userInput: '',
      messages: [],
      currentProject: null,
      projects: [],
      generatedCode: '',
      isGenerating: false,
      isBuilding: false,
      isAuditing: false,
      isDeploying: false,
      isReviewing: false,
      credits: 1000
    });
    
    // Add welcome message after reset
    setTimeout(() => {
      addAIMessage('Hello! I can help you build on Solana — try commands like "create contract", "make gaming contract", "build DEX contract", "generate token contract", or "create NFT contract" to see the magic happen!', false);
    }, 500);
  };

  const addUserMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      credits: prev.credits - 100 // Contract generation cost
    }));
  };

  const addAIMessage = (content: string, isTyping: boolean = false) => {
    const newMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'ai',
      content,
      timestamp: new Date(),
      isTyping
    };

    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));

    // On mobile switch to Contract tab during generation
    if (content.includes("Generating your contract now...") && window.innerWidth < 768) {
      setMobileActiveTab('code');
    }

    if (isTyping) {
      setTimeout(() => {
        setDemoState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === newMessage.id ? { ...msg, isTyping: false } : msg
          )
        }));
      }, 2000);
    }
  };

  const generateCode = () => {
    setDemoState(prev => ({ 
      ...prev, 
      isGenerating: true,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'generating' } : null
    }));
    
    // The CodeGenerationStages component will handle the animation
    // and call onComplete when done, which will set isGenerating to false
    // and show the generated code
  };

  const createProject = () => {
    const projectNumber = (demoState.projects?.length || 0) + 1;
    const newProject: Project = {
      id: generateUniqueId(),
      name: `Project ${projectNumber}`,
      status: 'generating',
      description: 'Smart contract generated by AI',
      createdAt: new Date()
    };

    setDemoState(prev => ({ 
      ...prev, 
      currentProject: newProject,
      projects: [...prev.projects, newProject] // Add project to end of list
    }));
  };

  const handleManualInput = () => {
    if (!demoState.userInput.trim()) return;

    const userMessage = demoState.userInput;
    console.log('User input:', userMessage); // Debug log
    addUserMessage(userMessage);
    
    // Check if this is a generation command
    const input = userMessage.toLowerCase();
    const isGenerationCommand = input.includes('create program') || 
                               input.includes('create smart contract') ||
                               input.includes('generate program') ||
                               input.includes('build contract') ||
                               input.includes('make dex') ||
                               (input.includes('create') && (input.includes('contract') || input.includes('program'))) ||
                               (input.includes('generate') && (input.includes('contract') || input.includes('program'))) ||
                               (input.includes('build') && (input.includes('contract') || input.includes('program'))) ||
                               (input.includes('make') && (input.includes('dex') || input.includes('contract')));
    
    // Don't set isGenerating immediately - wait for AI response first
    setDemoState(prev => ({ ...prev, userInput: '', isGenerating: false }));

    // AI Response Logic
    setTimeout(() => {
      const response = generateAIResponse(userMessage);
      console.log('AI response:', response); // Debug log
      addAIMessage(response, false);
      
      // If it's a generation command, trigger generation after response
      if (isGenerationCommand) {
        // Set isGenerating to true to start animation
        setDemoState(prev => ({ ...prev, isGenerating: true }));
        
        setTimeout(() => {
          generateCode();
          createProject();
        }, 1000);
      }
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Check for generation activation commands first
    const isGenerationCommand = input.includes('create program') || 
                               input.includes('create smart contract') ||
                               input.includes('generate program') ||
                               input.includes('build contract') ||
                               input.includes('make dex') ||
                               (input.includes('create') && (input.includes('contract') || input.includes('program'))) ||
                               (input.includes('generate') && (input.includes('contract') || input.includes('program'))) ||
                               (input.includes('build') && (input.includes('contract') || input.includes('program'))) ||
                               (input.includes('make') && (input.includes('dex') || input.includes('contract')));
    
    if (isGenerationCommand) {
      // Determine context for generation
      let context = '';
      if (input.includes('dex') || input.includes('exchange')) {
        context = 'dex';
      } else if (input.includes('nft') || input.includes('non-fungible')) {
        context = 'nft';
      } else if (input.includes('token') || input.includes('tokens') || input.includes('erc20') || input.includes('fungible')) {
        context = 'token';
      } else if (input.includes('staking') || input.includes('defi') || input.includes('yield')) {
        context = 'defi';
      } else if (input.includes('dao') || input.includes('governance') || input.includes('voting')) {
        context = 'dao';
      } else if (input.includes('game') || input.includes('gaming')) {
        context = 'gaming';
      } else {
        context = 'defi'; // Default DeFi
      }
      
      setGenerationContext(context);
      return "Generating your contract now...";
    }
    
    // Greeting responses
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return "Hello! I'm your AI assistant for creating Solana smart contracts. I can help you build tokens, NFTs, DeFi protocols, and more. What would you like to create today?";
    }
    
    // Token creation
    if (input.includes('token') || input.includes('coin')) {
      return "Great! I'd love to help you create a token on Solana. To make this perfect, I need to understand a few details:\n\n1. What type of token do you need?\n   - Utility token (for app usage)\n   - Governance token (for voting)\n   - Rewards/points (for games or loyalty)\n\n2. What's the maximum supply?\n3. Who should control token minting?\n4. Tell me about your project - what does it do?\n\nThis will help me create the perfect token contract for your needs!";
    }
    
    // NFT creation
    if (input.includes('nft') || input.includes('collection')) {
      return "Excellent! NFTs are a great way to create unique digital assets. Let me help you build the perfect NFT collection:\n\n1. What's your collection theme or purpose?\n2. How many NFTs in the collection?\n3. Do you want royalty fees for creators?\n4. Should there be a whitelist for early minters?\n5. What's the mint price in SOL?\n\nOnce I understand these details, I'll create a complete NFT contract with minting, trading, and royalty features!";
    }
    
    // DeFi protocols
    if (input.includes('dex') || input.includes('swap') || input.includes('defi') || input.includes('liquidity')) {
      return "Perfect! DeFi protocols are powerful tools for decentralized finance. I can help you create:\n\n1. **Simple DEX** - token swapping with liquidity pools\n2. **Staking platform** - users lock tokens, earn rewards\n3. **Lending protocol** - borrow/lend with interest\n4. **Yield farming** - provide liquidity, earn fees\n\nWhat specific DeFi functionality do you need? Tell me about your use case and I'll design the perfect contract!";
    }
    
    // Gaming
    if (input.includes('game') || input.includes('gaming') || input.includes('play')) {
      return "GameFi is exciting! I can help you create gaming contracts with:\n\n1. **Game tokens** - in-game currency and rewards\n2. **Achievement NFTs** - unlockable items and badges\n3. **Battle systems** - PvP with token rewards\n4. **Guild mechanics** - team-based gameplay\n\nWhat type of game are you building? Is it PvP, PvE, or something else? I'll create the perfect gaming economy!";
    }
    
    // DAO
    if (input.includes('dao') || input.includes('governance') || input.includes('voting')) {
      return "DAOs are great for community governance! I can help you create:\n\n1. **Voting system** - proposal creation and voting\n2. **Treasury management** - fund allocation and spending\n3. **Member management** - joining/leaving the DAO\n4. **Proposal system** - creating and executing decisions\n\nWhat kind of decisions will your DAO make? How should voting power be distributed?";
    }
    
    // Vague requests
    if (input.includes('money') || input.includes('earn') || input.includes('profit')) {
      return "I understand you want to create something profitable! That's a great motivation. Let me help you find the right approach:\n\n1. **DeFi platform** - users provide liquidity, earn fees\n2. **NFT project** - sell unique tokens with royalties\n3. **Staking platform** - users lock tokens, earn rewards\n4. **GameFi** - game with economy and NFTs\n5. **DAO with treasury** - collective fund management\n\nWhich of these matches your vision? Or do you have a different concept in mind?";
    }
    
    // Off-topic
    if (input.includes('blockchain') || input.includes('crypto') || input.includes('bitcoin') || input.includes('ethereum')) {
      return "That's an interesting question about blockchain technology! While I can explain the basics, my main specialty is helping you create smart contracts on Solana.\n\nIf you have an idea for a project or application you want to launch on blockchain, I can help turn it into a ready smart contract.\n\nWhat do you want to build? Maybe:\n- Your own token or coin?\n- An NFT collection?\n- A DeFi application?\n- Something for games or community?";
    }
    
    // Default response
    return "I'd love to help you create a smart contract! To give you the best solution, could you tell me more about:\n\n1. What type of project are you building?\n2. What functionality do you need?\n3. Who will use your contract?\n\nI specialize in creating tokens, NFTs, DeFi protocols, gaming contracts, and DAOs on Solana. What interests you most?";
  };

  const handleBuild = () => {
    // Start Building animation
    setDemoState(prev => ({
      ...prev,
      isBuilding: true,
      credits: prev.credits - 25,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'building' } : null,
      projects: prev.projects.map(project => 
        project.id === prev.currentProject?.id 
          ? { ...project, status: 'building' }
          : project
      )
    }));

    // Add regular message about build start (without green highlight)
    const systemMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'ai',
      content: 'Building smart contract... This may take a few moments.',
      timestamp: new Date()
    };
    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
  };

  const handleAudit = () => {
    // Start Audit animation
    setDemoState(prev => ({
      ...prev,
      isAuditing: true,
      credits: prev.credits - 30,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'auditing' } : null,
      projects: prev.projects.map(project => 
        project.id === prev.currentProject?.id 
          ? { ...project, status: 'auditing' }
          : project
      )
    }));

    // Add regular message about audit start (without green highlight)
    const systemMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'ai',
      content: 'Starting security audit... This may take a few moments.',
      timestamp: new Date()
    };
    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
  };

  const handleDeploy = () => {
    // Start Deploy animation
    setDemoState(prev => ({
      ...prev,
      isDeploying: true,
      credits: prev.credits - 50,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'deploying' } : null,
      projects: prev.projects.map(project => 
        project.id === prev.currentProject?.id 
          ? { ...project, status: 'deploying' }
          : project
      )
    }));

    // Save original code for comparison
    setOriginalDeployedCode(contractCode);

    // Add regular message about deploy start (without green highlight)
    const systemMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'ai',
      content: 'Starting deployment... This may take a few moments.',
      timestamp: new Date()
    };
    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
  };

  const handleUpgrade = () => {
    // Start Deploy animation (та же что и при Publish)
    setDemoState(prev => ({
      ...prev,
      isDeploying: true,
      credits: prev.credits - 50,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'deploying' } : null,
      projects: prev.projects.map(project => 
        project.id === prev.currentProject?.id 
          ? { ...project, status: 'deploying' }
          : project
      )
    }));

    // Add message about upgrade start
    const systemMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'ai',
      content: 'Starting contract upgrade... This may take a few moments.',
      timestamp: new Date()
    };
    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
  };

  const handleReview = () => {
    // Set reviewing state
    setDemoState(prev => ({
      ...prev,
      isReviewing: true
    }));

    // Create project if it doesn't exist
    if (!demoState.currentProject) {
      const projectNumber = (demoState.projects?.length || 0) + 1;
      const newProject: Project = {
        id: generateUniqueId(),
        name: `Project ${projectNumber}`,
        status: 'generated',
        description: 'Code review project',
        createdAt: new Date()
      };
      
      setDemoState(prev => ({
        ...prev,
        currentProject: newProject,
        projects: [...prev.projects, newProject]
      }));
    }
    
    // Add AI analysis messages
    const analysisMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'ai',
      content: 'Analyzing your smart contract code...',
      timestamp: new Date()
    };
    
    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, analysisMessage]
    }));
    
    // Simulate AI analysis with delays
    setTimeout(() => {
      const analysisCompleteMessage: ChatMessage = {
        id: generateUniqueId(),
        type: 'ai',
        content: 'Code analysis complete! Found several optimization opportunities and potential improvements. The contract structure looks good overall.',
        timestamp: new Date()
      };
      
      setDemoState(prev => ({
        ...prev,
        messages: [...prev.messages, analysisCompleteMessage]
      }));
      
      setTimeout(() => {
        const reviewCompleteMessage: ChatMessage = {
          id: generateUniqueId(),
          type: 'system',
          content: 'Review finished! Applied necessary fixes and optimizations. Your contract is now ready for building.',
          timestamp: new Date()
        };
        
        setDemoState(prev => ({
          ...prev,
          isReviewing: false,
          messages: [...prev.messages, reviewCompleteMessage],
          currentProject: prev.currentProject ? { ...prev.currentProject, status: 'generated' } : null
        }));
        
        // Change source to ai-generated to show Build button
        setCodeSource('ai-generated');
      }, 1500);
    }, 2000);
  };

  const handleCodeChange = (code: string, source: CodeSource) => {
    setContractCode(code);
    setCodeSource(source);
    
    // Update originalDeployedCode if this is deployed contract
    if (demoState.currentProject?.status === 'deployed' && !originalDeployedCode) {
      setOriginalDeployedCode(code);
    }
    
    // Update generatedCode in demoState
    setDemoState(prev => ({
      ...prev,
      generatedCode: code
    }));
  };

  const handleGenerationComplete = (code: string) => {
    // Code already updated via handleCodeChange
    setDemoState(prev => ({
      ...prev,
      isGenerating: false,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'generated' } : null,
      projects: prev.projects.map(project => 
        project.id === prev.currentProject?.id 
          ? { ...project, status: 'generated' }
          : project
      )
    }));
    
    // Add green notification about successful generation
    const successMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'system',
      content: 'Smart contract generated successfully! The contract is ready for building and testing.',
      timestamp: new Date()
    };
    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, successMessage]
    }));
  };

  const handleGenerationCompleteForEditor = () => {
    // For InteractiveCodeEditor - without parameters
    setDemoState(prev => ({
      ...prev,
      isGenerating: false,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'generated' } : null,
      projects: prev.projects.map(project => 
        project.id === prev.currentProject?.id 
          ? { ...project, status: 'generated' }
          : project
      )
    }));
  };


  const handleCreateNewProject = () => {
    const projectNumber = (demoState.projects?.length || 0) + 1;
    const newProject: Project = {
      id: generateUniqueId(),
      name: `Project ${projectNumber}`,
      description: '',
      status: 'new',
      createdAt: new Date()
    };

    setDemoState(prev => ({
      ...prev,
      currentProject: newProject,
      projects: [...(prev.projects || []), newProject],
      credits: prev.credits - 10 // Project creation cost
    }));

    // Add system message
    const systemMessage: ChatMessage = {
      id: generateUniqueId(),
      type: 'system',
      content: 'New project created successfully!',
      timestamp: new Date()
    };

    setDemoState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
  };

  const handleDeleteProject = (projectId: string) => {
    setDemoState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId),
      currentProject: prev.currentProject?.id === projectId ? null : prev.currentProject
    }));
  };

  const handleSaveRenameMobile = (projectId: string) => {
    if (editingProjectName.trim()) {
      setDemoState(prev => ({
        ...prev,
        projects: prev.projects.map(p => 
          p.id === projectId 
            ? { ...p, name: editingProjectName.trim() }
            : p
        )
      }));
    }
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const handleRenameProject = (projectId: string) => {
    const project = demoState.projects.find(p => p.id === projectId);
    if (project) {
      setEditingProjectId(projectId);
      setEditingName(project.name);
    }
  };

  const handleSaveRename = (projectId: string) => {
    if (editingName.trim()) {
      setDemoState(prev => ({
        ...prev,
        projects: prev.projects.map(p => 
          p.id === projectId ? { ...p, name: editingName.trim() } : p
        ),
        currentProject: prev.currentProject?.id === projectId 
          ? { ...prev.currentProject, name: editingName.trim() }
          : prev.currentProject
      }));
    }
    setEditingProjectId(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingProjectId(null);
    setEditingName('');
  };


  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'new': return 'text-gray-400';
      case 'generating': return 'text-purple-400';
      case 'generated': return 'text-green-400';
      case 'auditing': return 'text-blue-400';
      case 'audited': return 'text-green-400';
      case 'building': return 'text-yellow-400';
      case 'built': return 'text-green-400';
      case 'deploying': return 'text-orange-400';
      case 'deployed': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'generating':
      case 'auditing':
      case 'building':
      case 'deploying':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'generated':
      case 'audited':
      case 'built':
      case 'deployed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  const handleBuildComplete = () => {
    setDemoState(prev => ({
      ...prev,
      isBuilding: false,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'built' } : null
    }));
    
    // Update project in list
    if (demoState.currentProject) {
      setDemoState(prev => ({
        ...prev,
        projects: prev.projects.map(p => 
          p.id === prev.currentProject?.id 
            ? { ...p, status: 'built' }
            : p
        )
      }));
    }
    
  };

  const handleAuditComplete = () => {
    setDemoState(prev => ({
      ...prev,
      isAuditing: false,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'audited' } : null
    }));
    
    // Update project in list
    if (demoState.currentProject) {
      setDemoState(prev => ({
        ...prev,
        projects: prev.projects.map(p => 
          p.id === prev.currentProject?.id 
            ? { ...p, status: 'audited' }
            : p
        )
      }));
    }
    
  };

  const handleDeployComplete = () => {
    setDemoState(prev => ({
      ...prev,
      isDeploying: false,
      currentProject: prev.currentProject ? { ...prev.currentProject, status: 'deployed' } : null
    }));
    
    // Update project in list
    if (demoState.currentProject) {
      setDemoState(prev => ({
        ...prev,
        projects: prev.projects.map(p => 
          p.id === prev.currentProject?.id 
            ? { ...p, status: 'deployed' }
            : p
        )
      }));
    }
    
  };

  return (
    <div 
      ref={demoRef} 
      className="w-full max-w-6xl mx-auto bg-[#101010] rounded-2xl overflow-hidden relative interactive-demo-tablet"
      style={{
        background: 'linear-gradient(135deg, #101010 0%, #1a1a1a 100%)',
        border: '0.5px solid #ff6633',
        position: 'relative',
        transform: 'translateZ(0)', // Create new stacking context
        willChange: 'transform' // GSAP optimization
      }}
    >
      
      {/* Mobile Tabs - только на мобильных */}
      <div className="md:hidden h-[40px] bg-[#191919] border-b border-[#333] flex flex-shrink-0">
        <button 
          onClick={() => setMobileActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
            mobileActiveTab === 'chat' 
              ? 'text-orange-500 bg-orange-500/10' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          AI Chat
        </button>
        <button 
          onClick={() => setMobileActiveTab('code')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
            mobileActiveTab === 'code' 
              ? 'text-orange-500 bg-orange-500/10' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Contract
        </button>
        <button 
          onClick={() => setMobileActiveTab('network')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
            mobileActiveTab === 'network' 
              ? 'text-orange-500 bg-orange-500/10' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
            <path d="M2 17L12 22L22 17"/>
            <path d="M2 12L12 17L22 12"/>
          </svg>
          Network
        </button>
      </div>
      
      {/* Main Content - идентичный основному дашборду */}
      <main className="hidden md:flex h-[660px]">
        {/* Left Sidebar - AI Agent Chat (40%) */}
        <div className="w-[40%] bg-[#0a0a0a] border-r border-[#191919] flex flex-col">
          {/* Chat Header */}
          <div className="bg-[#0a0a0a] border-b border-[#191919] p-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-orange-500" />
              <h3 className={`text-xs font-semibold text-white ${isTablet ? 'text-[10px]' : ''}`}>AI Agent Chat</h3>
              
            </div>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 px-3 pt-2 overflow-y-auto space-y-3 min-h-0">
            <AnimatePresence>
              {demoState.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`flex gap-2 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                        : 'bg-[#191919]'
                    }`}>
                      {message.type === 'user' ? (
                        <UserIcon className="w-3 h-3 text-white" />
                      ) : (
                        <Bot className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-[85%] ${message.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`rounded p-2 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30'
                          : 'bg-[#191919] border border-[#333]'
                      }`}>
                        <div className={`text-white text-xs leading-relaxed whitespace-pre-line chat-message ${isTablet ? 'text-[9px]' : ''}`}>{message.content}</div>
                        {message.isTyping && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-[#666] mt-0.5 timestamp">
                        {message.timestamp.toLocaleTimeString('en-US', { 
                          hour12: true, 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="border-t border-[#191919] px-3 py-2 min-h-[48px] flex items-center">
            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={demoState.userInput}
                onChange={(e) => setDemoState(prev => ({ ...prev, userInput: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleManualInput()}
                placeholder="Describe your smart contract requirements..."
                className={`flex-1 px-3 py-1.5 bg-[#191919] border border-[#333] rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-orange-500 text-xs ${isTablet ? 'text-[9px] px-2 py-1' : ''}`}
                disabled={demoState.isGenerating}
              />
              <button
                onClick={handleManualInput}
                disabled={!demoState.userInput.trim() || demoState.isGenerating}
                className="px-4 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {demoState.isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column - Smart Contract Preview (40%) */}
        <div className="w-[40%] flex flex-col">
          {/* Code Header */}
          <div className="bg-[#0a0a0a] border-b border-[#191919] p-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-orange-500" />
              <h3 className={`text-xs font-semibold text-white ${isTablet ? 'text-[10px]' : ''}`}>Smart Contract Preview</h3>
            </div>
          </div>
          
          {/* Code Content */}
          <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-4 relative min-h-0">
            {/* Анимации заменяют InteractiveCodeEditor */}
            {demoState.isBuilding && (
              <BuildStages 
                  isBuilding={demoState.isBuilding}
                  onComplete={() => {
                    setDemoState(prev => ({ 
                        ...prev, 
                        isBuilding: false,
                        currentProject: prev.currentProject ? { ...prev.currentProject, status: 'built' } : null,
                        projects: prev.projects.map(project => 
                          project.id === prev.currentProject?.id 
                            ? { ...project, status: 'built' }
                            : project
                        )
                      }));
                      
                      // Add final success message
                      const successMessage: ChatMessage = {
                        id: generateUniqueId(),
                        type: 'system',
                        content: 'Smart contract built successfully! Ready for audit and deployment.',
                        timestamp: new Date()
                      };
                      setDemoState(prev => ({
                        ...prev,
                        messages: [...prev.messages, successMessage]
                      }));
                    }}
                    onAddAIMessage={(message) => {
                      const aiMessage: ChatMessage = {
                        id: generateUniqueId(),
                        type: 'ai',
                        content: message,
                        timestamp: new Date()
                      };
                      setDemoState(prev => ({
                        ...prev,
                        messages: [...prev.messages, aiMessage]
                      }));
                    }}
                  />
            )}
            
            {demoState.isAuditing && (
              <AuditStages 
                  isAuditing={demoState.isAuditing}
                  onComplete={() => {
                    setDemoState(prev => ({ 
                        ...prev, 
                        isAuditing: false,
                        currentProject: prev.currentProject ? { ...prev.currentProject, status: 'audited' } : null,
                        projects: prev.projects.map(project => 
                          project.id === prev.currentProject?.id 
                            ? { ...project, status: 'audited' }
                            : project
                        )
                      }));
                      
                      // Add final success message
                      const successMessage: ChatMessage = {
                        id: generateUniqueId(),
                        type: 'system',
                        content: 'Security audit completed successfully! Contract is ready for deployment.',
                        timestamp: new Date()
                      };
                      setDemoState(prev => ({
                        ...prev,
                        messages: [...prev.messages, successMessage]
                      }));
                    }}
                    onAddAIMessage={(message) => {
                      const aiMessage: ChatMessage = {
                        id: generateUniqueId(),
                        type: 'ai',
                        content: message,
                        timestamp: new Date()
                      };
                      setDemoState(prev => ({
                        ...prev,
                        messages: [...prev.messages, aiMessage]
                      }));
                    }}
                  />
            )}
            
            {demoState.isDeploying && (
              <DeployStages 
                  isDeploying={demoState.isDeploying}
                  onComplete={() => {
                    setDemoState(prev => ({ 
                        ...prev, 
                        isDeploying: false,
                        currentProject: prev.currentProject ? { ...prev.currentProject, status: 'deployed' } : null,
                        projects: prev.projects.map(project => 
                          project.id === prev.currentProject?.id 
                            ? { ...project, status: 'deployed' }
                            : project
                        )
                      }));
                      
                      // Update original code after successful deploy/upgrade
                      setOriginalDeployedCode(contractCode);
                      
                      // Add final success message
                      const successMessage: ChatMessage = {
                        id: generateUniqueId(),
                        type: 'system',
                        content: 'Contract deployed successfully! Your smart contract is now live on Solana.',
                        timestamp: new Date()
                      };
                      setDemoState(prev => ({
                        ...prev,
                        messages: [...prev.messages, successMessage]
                      }));
                    }}
                    onAddAIMessage={(message) => {
                      const aiMessage: ChatMessage = {
                        id: generateUniqueId(),
                        type: 'ai',
                        content: message,
                        timestamp: new Date()
                      };
                      setDemoState(prev => ({
                        ...prev,
                        messages: [...prev.messages, aiMessage]
                      }));
                    }}
                  />
            )}
            
            {/* InteractiveCodeEditor - показывается только когда нет анимаций */}
            {!demoState.isBuilding && !demoState.isAuditing && !demoState.isDeploying && (
              <InteractiveCodeEditor
                initialCode={contractCode}
                onCodeChange={handleCodeChange}
                isGenerating={demoState.isGenerating}
                onGenerationComplete={handleGenerationCompleteForEditor}
                onAddAIMessage={(message) => {
                  const aiMessage: ChatMessage = {
                    id: generateUniqueId(),
                    type: 'ai',
                    content: message,
                    timestamp: new Date()
                  };
                  setDemoState(prev => ({
                    ...prev,
                    messages: [...prev.messages, aiMessage]
                  }));
                }}
                context={generationContext}
                placeholder="Describe your smart contract requirements..."
                isTablet={isTablet}
              />
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="border-t border-[#191919] px-3 py-2 min-h-[48px] flex items-center">
            <div className="flex items-center justify-between w-full">
              {demoState.currentProject?.status === 'deployed' ? (
                <div className="text-[7px] text-[#666] leading-none deployment-info">
                  <div>Published: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour12: false })}</div>
                  <div>Last Update: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour12: false })}</div>
                  <div>Address: ExampleContract123...ABC</div>
                </div>
              ) : (
                <p className="text-xs text-[#666]">This preview updates as you chat with AI agents.</p>
              )}
              <button 
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                  // Upgrade button for deployed contracts with changes
                  demoState.currentProject?.status === 'deployed' && contractCode.trim() && contractCode !== originalDeployedCode
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : // Review button for user-input code (only if not deployed)
                    codeSource === 'user-input' && contractCode.trim() && demoState.currentProject?.status !== 'deployed'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : demoState.currentProject?.status === 'generated' && contractCode.trim()
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : demoState.currentProject?.status === 'built'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : demoState.currentProject?.status === 'audited'
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-orange-500/30 text-orange-300 cursor-not-allowed'
                }`}
                disabled={!contractCode.trim() || demoState.isBuilding || demoState.isAuditing || demoState.isDeploying || demoState.isReviewing}
                onClick={() => {
                  if (demoState.currentProject?.status === 'deployed' && contractCode.trim() && contractCode !== originalDeployedCode) {
                    handleUpgrade();
                  } else if (codeSource === 'user-input' && contractCode.trim() && demoState.currentProject?.status !== 'deployed') {
                    handleReview();
                  } else if (demoState.currentProject?.status === 'generated' && contractCode.trim()) {
                    handleBuild();
                  } else if (demoState.currentProject?.status === 'built') {
                    handleAudit();
                  } else if (demoState.currentProject?.status === 'audited') {
                    handleDeploy();
                  }
                }}
              >
                {demoState.isBuilding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Building...
                  </>
                ) : demoState.isAuditing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Auditing...
                  </>
                ) : demoState.isDeploying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deploying...
                  </>
                ) : demoState.isReviewing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Reviewing...
                  </>
                ) : demoState.currentProject?.status === 'deployed' && contractCode.trim() && contractCode !== originalDeployedCode ? (
                  <>
                    <Rocket className="w-3.5 h-3.5" />
                    Upgrade
                  </>
                ) : codeSource === 'user-input' && contractCode.trim() && demoState.currentProject?.status !== 'deployed' ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Review
                  </>
                ) : demoState.currentProject?.status === 'generated' && contractCode.trim() ? (
                  <>
                    <Code className="w-3.5 h-3.5" />
                    Build
                  </>
                ) : demoState.currentProject?.status === 'built' ? (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    Audit
                  </>
                ) : demoState.currentProject?.status === 'audited' ? (
                  <>
                    <Rocket className="w-3.5 h-3.5" />
                    Publish
                  </>
                ) : demoState.currentProject?.status === 'deployed' ? (
                  <>
                    <Rocket className="w-3.5 h-3.5" />
                    Upgrade
                  </>
                ) : (
                  <>
                    <Rocket className="w-3.5 h-3.5" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Network & Projects (20%) */}
        <div className="w-[20%] bg-[#0a0a0a] border-l border-[#191919] flex flex-col">
          {/* Network Section */}
          <div className="bg-[#0a0a0a] border-b border-[#191919] p-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-semibold text-white ${isTablet ? 'text-[10px]' : ''}`}>Network</h3>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-[#989898] network-text">{isMainNet ? 'MainNet' : 'DevNet'}</span>
                <div 
                  className={`w-8 h-4 rounded-full relative cursor-pointer transition-all duration-300 ${
                    isMainNet ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                  onClick={() => setIsMainNet(!isMainNet)}
                >
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                    isMainNet ? 'right-0.5' : 'left-0.5'
                  }`}></div>
                </div>
                {!isMainNet && (
                  <a 
                    href="https://faucet.solana.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[8px] text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    Get SOL
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {/* Projects Header */}
          <div className="bg-[#0a0a0a] border-b border-[#191919] p-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-semibold text-white ${isTablet ? 'text-[10px]' : ''}`}>My Projects ({demoState.projects.length})</h3>
              <button 
                onClick={handleCreateNewProject}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-transparent border border-orange-500 text-orange-500 rounded hover:bg-orange-500/20 transition-all text-[9px] font-medium create-new-btn"
              >
                <Plus className="w-3 h-3" />
                Create New
              </button>
            </div>
          </div>
          
          {/* Projects List */}
          <div className="flex-1 overflow-y-auto p-3">
            {demoState.projects.length > 0 ? (
              <div className="space-y-2">
                {demoState.projects.map((project) => (
                  <div key={project.id} className="p-2 bg-[#191919] rounded-lg border border-[#333]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1">
                        {getStatusIcon(project.status)}
                        {editingProjectId === project.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') handleSaveRename(project.id);
                                if (e.key === 'Escape') handleCancelRename();
                              }}
                              className="flex-1 px-1 py-0.5 bg-[#0a0a0a] border border-orange-500 rounded text-xs text-white focus:outline-none focus:border-orange-400"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRename(project.id)}
                              className="p-0.5 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded transition-colors"
                              title="Save"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelRename}
                              className="p-0.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                              title="Cancel"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium project-status text-white project-name">
                            {project.name}
                          </span>
                        )}
                      </div>
                      {editingProjectId !== project.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                            title="Delete project"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRenameProject(project.id)}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                            title="Rename project"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span className="text-xs text-[#666]">
                        {project.createdAt.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FolderPlus className="w-8 h-8 text-[#666] mx-auto mb-2" />
                  <p className="text-[#666] mb-1 text-xs">No projects yet</p>
                  <p className="text-xs text-[#666]">Start by creating a project.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Credits */}
          <div className="border-t border-[#191919] px-3 py-2 min-h-[48px] flex items-center">
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-500 text-[12px] font-medium credits-text">
                  Credits: {demoState.credits}
                </span>
              </div>
              <p className="text-[7px] text-[#666] mt-0">Fuel for AI Brain</p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Layout - абсолютное позиционирование для мобильных */}
      <div className="md:hidden h-[620px] relative overflow-x-hidden">
        
        {/* AI Agent Chat - мобильная версия */}
        <div className={`absolute inset-0 flex flex-col bg-[#0C0C0C] border border-[#333] rounded overflow-x-hidden ${
          mobileActiveTab === 'chat' ? 'block' : 'hidden'
        }`}>
          {/* Fixed Header */}
          <div className="p-2 pb-0 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-white text-sm font-semibold mb-2">
              <Bot className="w-4 h-4 text-orange-500" />
              AI Agent Chat
            </div>
          </div>
          
          {/* Scrollable Messages */}
          <div className="flex-1 px-2 pt-2 overflow-y-auto space-y-3 min-h-0">
            <AnimatePresence>
              {demoState.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`flex gap-2 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#191919]">
                      {message.type === 'user' ? (
                        <UserIcon className="w-3 h-3 text-white" />
                      ) : (
                        <Bot className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-[85%] ${message.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`rounded p-2 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30'
                          : 'bg-[#191919] border border-[#333]'
                      }`}>
                        <div className={`text-white text-xs leading-relaxed whitespace-pre-line chat-message ${isTablet ? 'text-[9px]' : ''}`}>{message.content}</div>
                        {message.isTyping && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-[#666] mt-0.5 timestamp">
                        {message.timestamp.toLocaleTimeString('en-US', { 
                          hour12: true, 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </motion.div>
              ))}
            </AnimatePresence>
            <div ref={mobileMessagesEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="border-t border-[#191919] p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={demoState.userInput}
                onChange={(e) => setDemoState(prev => ({ ...prev, userInput: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleManualInput()}
                placeholder="Describe your smart contract requirements..."
                className={`flex-1 px-3 py-1.5 bg-[#191919] border border-[#333] rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-orange-500 text-xs ${isTablet ? 'text-[9px] px-2 py-1' : ''}`}
                disabled={demoState.isGenerating}
              />
              <button
                onClick={handleManualInput}
                disabled={!demoState.userInput.trim() || demoState.isGenerating}
                className="px-4 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {demoState.isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Smart Contract Preview - мобильная версия */}
        <div className={`absolute inset-0 flex flex-col bg-[#0A0A0A] border border-[#333] rounded overflow-x-hidden ${
          mobileActiveTab === 'code' ? 'block' : 'hidden'
        }`}>
          {/* Fixed Header */}
          <div className="p-2 pb-0 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-white text-sm font-semibold mb-2">
              <Code className="w-4 h-4 text-orange-500" />
              Smart Contract Preview
            </div>
          </div>
          
          {/* Interactive Code Area */}
          <div className="flex-1 p-2 min-h-0">
            {demoState.isGenerating ? (
              <CodeGenerationStages 
                onComplete={handleGenerationComplete}
                context={generationContext}
                isGenerating={demoState.isGenerating}
              />
            ) : demoState.isBuilding ? (
              <BuildStages 
                onComplete={handleBuildComplete}
                onAddAIMessage={() => {}}
                isBuilding={demoState.isBuilding}
              />
            ) : demoState.isAuditing ? (
              <AuditStages 
                onComplete={handleAuditComplete}
                onAddAIMessage={() => {}}
                isAuditing={demoState.isAuditing}
              />
            ) : demoState.isDeploying ? (
              <DeployStages 
                onComplete={handleDeployComplete}
                onAddAIMessage={() => {}}
                isDeploying={demoState.isDeploying}
              />
            ) : (
              <InteractiveCodeEditor
                initialCode={contractCode}
                onCodeChange={handleCodeChange}
                isGenerating={demoState.isGenerating}
                onGenerationComplete={handleGenerationCompleteForEditor}
                onAddAIMessage={(message) => {
                  const aiMessage: ChatMessage = {
                    id: generateUniqueId(),
                    type: 'ai',
                    content: message,
                    timestamp: new Date()
                  };
                  setDemoState(prev => ({
                    ...prev,
                    messages: [...prev.messages, aiMessage]
                  }));
                }}
                context={generationContext}
                placeholder="Describe your smart contract requirements..."
                isTablet={isTablet}
              />
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="border-t border-[#191919] p-2">
            <div className="flex items-center justify-between">
              {demoState.currentProject?.status === 'deployed' ? (
                <div className="text-[7px] text-[#666] leading-none deployment-info">
                  <div>Published: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour12: false })}</div>
                  <div>Last Update: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour12: false })}</div>
                  <div>Address: ExampleContract123...ABC</div>
                </div>
              ) : (
                <p className="text-xs text-[#666]">This preview updates as you chat with AI agents.</p>
              )}
              <button 
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                  // Upgrade button for deployed contracts with changes
                  demoState.currentProject?.status === 'deployed' && contractCode.trim() && contractCode !== originalDeployedCode
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : // Review button for user-input code (only if not deployed)
                    codeSource === 'user-input' && contractCode.trim() && demoState.currentProject?.status !== 'deployed'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : demoState.currentProject?.status === 'generated' && contractCode.trim()
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : demoState.currentProject?.status === 'built'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : demoState.currentProject?.status === 'audited'
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-orange-500/30 text-orange-300 cursor-not-allowed'
                }`}
                disabled={!contractCode.trim() || demoState.isBuilding || demoState.isAuditing || demoState.isDeploying || demoState.isReviewing}
                onClick={() => {
                  if (demoState.currentProject?.status === 'deployed' && contractCode.trim() && contractCode !== originalDeployedCode) {
                    handleUpgrade();
                  } else if (codeSource === 'user-input' && contractCode.trim() && demoState.currentProject?.status !== 'deployed') {
                    handleReview();
                  } else if (demoState.currentProject?.status === 'generated' && contractCode.trim()) {
                    handleBuild();
                  } else if (demoState.currentProject?.status === 'built') {
                    handleAudit();
                  } else if (demoState.currentProject?.status === 'audited') {
                    handleDeploy();
                  }
                }}
              >
                {demoState.isReviewing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reviewing...
                  </>
                ) : demoState.currentProject?.status === 'deployed' && contractCode.trim() && contractCode !== originalDeployedCode ? (
                  <>
                    <Rocket className="w-4 h-4" />
                    Upgrade
                  </>
                ) : codeSource === 'user-input' && contractCode.trim() && demoState.currentProject?.status !== 'deployed' ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Review
                  </>
                ) : demoState.currentProject?.status === 'generated' && contractCode.trim() ? (
                  <>
                    <Shield className="w-4 h-4" />
                    Build
                  </>
                ) : demoState.currentProject?.status === 'built' ? (
                  <>
                    <Shield className="w-4 h-4" />
                    Audit
                  </>
                ) : demoState.currentProject?.status === 'audited' ? (
                  <>
                    <Rocket className="w-4 h-4" />
                    Publish
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Network Panel - мобильная версия */}
        <div className={`absolute inset-0 overflow-x-hidden ${
          mobileActiveTab === 'network' ? 'block' : 'hidden'
        }`}>
          <div className="flex flex-col h-full bg-[#0A0A0A] border border-[#333] rounded overflow-x-hidden">
            {/* Network Section */}
            <div className="bg-[#0a0a0a] border-b border-[#191919] p-2">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold text-white ${isTablet ? 'text-[10px]' : ''}`}>Network</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-[#989898] network-text">{isMainNet ? 'MainNet' : 'DevNet'}</span>
                  <div 
                    className={`w-8 h-4 rounded-full relative cursor-pointer transition-all duration-300 ${
                      isMainNet ? 'bg-orange-500' : 'bg-gray-600'
                    }`}
                    onClick={() => setIsMainNet(!isMainNet)}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 ${
                      isMainNet ? 'right-0.5' : 'left-0.5'
                    }`}></div>
                  </div>
                  {!isMainNet && (
                    <a 
                      href="https://faucet.solana.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[8px] text-orange-500 hover:text-orange-400 transition-colors"
                    >
                      Get SOL
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            {/* Projects Header */}
            <div className="bg-[#0a0a0a] border-b border-[#191919] p-2">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold text-white ${isTablet ? 'text-[10px]' : ''}`}>My Projects ({demoState.projects.length})</h3>
                <button 
                  onClick={handleCreateNewProject}
                  className="flex items-center justify-center gap-1 px-2 py-1 bg-transparent border border-orange-500 text-orange-500 rounded hover:bg-orange-500/20 transition-all text-[9px] font-medium create-new-btn"
                >
                  <Plus className="w-3 h-3" />
                  Create New
                </button>
              </div>
            </div>
            
            {/* Projects List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {demoState.projects.length > 0 ? (
                demoState.projects.map((project) => (
                  <div key={project.id} className="bg-[#191919] border border-[#333] rounded p-2 hover:border-orange-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        {editingProjectId === project.id ? (
                          <input
                            type="text"
                            value={editingProjectName}
                            onChange={(e) => setEditingProjectName(e.target.value)}
                            onBlur={() => handleSaveRenameMobile(project.id)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveRenameMobile(project.id)}
                            className="flex-1 px-1 py-0.5 bg-[#0a0a0a] border border-orange-500 rounded text-xs text-white focus:outline-none focus:border-orange-400"
                            autoFocus
                          />
                        ) : (
                          <span className="text-xs font-medium project-status text-white project-name">
                            {project.name}
                          </span>
                        )}
                      </div>
                      {editingProjectId !== project.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                            title="Delete project"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setEditingProjectId(project.id);
                              setEditingProjectName(project.name);
                            }}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                            title="Rename project"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span className="text-xs text-[#666]">
                        {project.createdAt.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FolderPlus className="w-8 h-8 text-[#666] mx-auto mb-2" />
                    <p className="text-[#666] mb-1 text-xs">No projects yet</p>
                    <p className="text-xs text-[#666]">Start by creating a project.</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Credits */}
            <div className="border-t border-[#191919] px-2 py-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-orange-500 text-[12px] font-medium credits-text">
                    Credits: {demoState.credits}
                  </span>
                </div>
                <p className="text-[7px] text-[#666] mt-0">Fuel for AI Brain</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

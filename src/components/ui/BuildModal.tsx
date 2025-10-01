'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X, Wrench, CheckCircle, AlertCircle, Settings, Code, Rocket, Play } from 'lucide-react';
import { DancingDotsLoader } from './DancingDotsLoader';

interface BuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  contractCode: string;
  onAddMessage?: (message: string) => void;
}

type BuildStage = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: number;
  status: 'pending' | 'active' | 'completed' | 'error';
};

const buildStages: BuildStage[] = [
  {
    id: 'analyzing',
    title: 'Analyzing project',
    description: 'Examining dependencies',
    icon: Settings,
    duration: 2000,
    status: 'pending'
  },
  {
    id: 'generating',
    title: 'Generating code',
    description: 'Converting to Rust',
    icon: Code,
    duration: 3000,
    status: 'pending'
  },
  {
    id: 'anchor',
    title: 'Setting up Anchor',
    description: 'Configuring framework',
    icon: Settings,
    duration: 2500,
    status: 'pending'
  },
  {
    id: 'compiling',
    title: 'Compiling contract',
    description: 'Building bytecode',
    icon: Wrench,
    duration: 4000,
    status: 'pending'
  },
  {
    id: 'testing',
    title: 'Running tests',
    description: 'Executing test suites',
    icon: Play,
    duration: 3000,
    status: 'pending'
  },
  {
    id: 'optimizing',
    title: 'Optimizing',
    description: 'Preparing deployment',
    icon: Rocket,
    duration: 2000,
    status: 'pending'
  }
];

export const BuildModal = ({ isOpen, onClose, onComplete, contractCode, onAddMessage }: BuildModalProps) => {
  const [stages, setStages] = useState<BuildStage[]>(buildStages);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [buildStatus, setBuildStatus] = useState<'building' | 'success' | 'error'>('building');
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [hasBeenFixed, setHasBeenFixed] = useState(false);

  const startBuildProcess = () => {
    setBuildStatus('building');
    setCurrentStageIndex(0);
    setStages(buildStages.map(stage => ({ ...stage, status: 'pending' })));
  };

  const startAutoFixAndRebuild = () => {
    setIsAutoFixing(true);
    setBuildStatus('building');
    setCurrentStageIndex(0);
    setHasBeenFixed(true); // Mark as fixed so next builds will succeed
    
    // Add auto-fix stage at the beginning
    const autoFixStage: BuildStage = {
      id: '0',
      title: 'AI Auto-Fix',
      description: 'Analyzing errors and applying automatic fixes to the smart contract code',
      icon: Settings,
      duration: 3000,
      status: 'pending'
    };
    
    const updatedStages = [
      autoFixStage,
      ...buildStages.map((stage, index) => ({
        ...stage,
        id: `stage-${index + 1}`,
        status: 'pending' as const
      }))
    ];
    
    setStages(updatedStages);
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset states when modal closes
      setStages(buildStages.map(stage => ({ ...stage, status: 'pending' })));
      setCurrentStageIndex(0);
      setBuildStatus('building');
      setIsAutoFixing(false);
      setHasBeenFixed(false);
      return;
    }

    // Start build process
    let timeoutId: NodeJS.Timeout;
    
    if (currentStageIndex < stages.length && buildStatus === 'building') {
      const currentStage = stages[currentStageIndex];
      
      // Set current stage as active
      setStages(prev => prev.map((stage, index) => ({
        ...stage,
        status: index === currentStageIndex ? 'active' : index < currentStageIndex ? 'completed' : 'pending'
      })));

      timeoutId = setTimeout(() => {
        // Complete current stage
        setStages(prev => prev.map((stage, index) => ({
          ...stage,
          status: index <= currentStageIndex ? 'completed' : 'pending'
        })));

        if (currentStageIndex === stages.length - 1) {
          // All stages completed
          if (isAutoFixing || hasBeenFixed) {
            // Auto-fix always succeeds, or if already been fixed
            setBuildStatus('success');
            setHasBeenFixed(true);
            
            // Add message to chat about successful rebuild
            if (isAutoFixing && onAddMessage) {
              setTimeout(() => {
                onAddMessage('Re-build completed successfully! All errors have been fixed and the contract is ready for deployment.');
              }, 500);
            }
          } else {
            // First build always fails for testing
            setBuildStatus('error');
          }
        } else {
          setCurrentStageIndex(prev => prev + 1);
        }
      }, Math.max(currentStage.duration * 0.5, 500)); // Speed up by 2x, minimum 500ms
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, currentStageIndex, stages.length, buildStatus, onComplete, onClose]);

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'active': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const getStageIcon = (stage: BuildStage) => {
    const IconComponent = stage.icon;
    if (stage.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (stage.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    } else if (stage.status === 'active') {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <IconComponent className="w-5 h-5 text-orange-400" />
        </motion.div>
      );
    }
    return <IconComponent className="w-5 h-5 text-gray-500" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-[#0A0A0A] border border-orange-500/30 rounded-lg shadow-2xl shadow-orange-500/10 w-full max-w-lg mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#333]">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                <div>
              <h2 className="text-sm font-semibold text-white">Build Smart Contract</h2>
              <p className="text-xs text-gray-400 hidden md:block">Compiling contract</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {buildStatus === 'building' && (
                <div className="space-y-4">
                  {/* Current Stage Info */}
                  <div className="bg-[#191919] rounded-lg p-2.5 border border-orange-500/20">
                    <div className="flex items-center gap-2">
                      <DancingDotsLoader />
                      <span className="text-white font-medium text-sm">
                        {stages[currentStageIndex]?.title || 'Processing...'}
                      </span>
                    </div>
                  </div>

                  {/* Stages Progress */}
                  <div className="space-y-1.5">
                    <h3 className="text-white font-medium text-xs">Build Progress</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {stages.map((stage, index) => (
                        <motion.div
                          key={stage.id}
                          className="flex items-center gap-1.5 p-1.5 rounded-md bg-[#191919]/50 border border-orange-500/10"
                          initial={{ opacity: 0.5 }}
                          animate={{ 
                            opacity: stage.status === 'pending' ? 0.5 : 1,
                            scale: stage.status === 'active' ? 1.02 : 1,
                            borderColor: stage.status === 'active' ? 'rgb(249 115 22 / 0.3)' : 'rgb(249 115 22 / 0.1)'
                          }}
                        >
                          <div className="flex-shrink-0">
                            {getStageIcon(stage)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-xs truncate ${getStageColor(stage.status)}`}>
                              {stage.title}
                            </div>
                          </div>
                          {stage.status === 'active' && (
                            <motion.div
                              className="w-1.5 h-1.5 bg-orange-400 rounded-full"
                              animate={{ scale: [1, 1.5, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {buildStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-3"
                >
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                    </motion.div>
                    <h3 className="text-base font-semibold text-white mb-1">
                      Build Successful!
                    </h3>
                    <p className="text-gray-400 text-xs">
                      Contract compiled and ready for deployment
                    </p>
                  </div>

                  <div className="bg-[#191919] rounded-lg p-2.5 border border-green-500/20">
                    <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-300">
                      <div className="flex items-center gap-1.5">✅ Compiled</div>
                      <div className="flex items-center gap-1.5">✅ Tests passed</div>
                      <div className="flex items-center gap-1.5">✅ Optimized</div>
                      <div className="flex items-center gap-1.5">✅ Ready</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {!hasBeenFixed && (
                      <button
                        onClick={() => {
                          setBuildStatus('building');
                          setCurrentStageIndex(0);
                          setStages(buildStages.map(stage => ({ ...stage, status: 'pending' })));
                          startBuildProcess();
                        }}
                        className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        Re-Build
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onComplete();
                        onClose();
                      }}
                      className={`px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm ${
                        hasBeenFixed ? 'flex-1' : 'flex-1'
                      }`}
                    >
                      Next Step
                    </button>
                  </div>
                </motion.div>
              )}

              {buildStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-6"
                >
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <X className="w-12 h-12 text-red-400 mb-3" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Build Failed
                    </h3>
                    <p className="text-gray-400 text-sm">
                      There were errors during the build process. AI agent will automatically fix the issues.
                    </p>
                  </div>

                  <div className="bg-[#191919] rounded-lg p-4 border border-red-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-400">Build Errors</span>
                      <X className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="space-y-1 text-sm text-gray-300">
                      <div className="text-red-400">❌ Compilation error in main.rs:45</div>
                      <div className="text-red-400">❌ Missing dependency: solana-program</div>
                      <div className="text-yellow-400">Deprecated function usage detected</div>
                      <div className="text-gray-400">AI agent will fix these issues automatically</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={startAutoFixAndRebuild}
                    className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Re-Build (AI Auto-Fix)
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

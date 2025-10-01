'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X, Rocket, CheckCircle, AlertCircle, Settings, Upload, Globe, ExternalLink } from 'lucide-react';
import { DancingDotsLoader } from './DancingDotsLoader';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  contractCode: string;
  network: 'devnet' | 'mainnet';
}

type DeployStage = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: number;
  status: 'pending' | 'active' | 'completed' | 'error';
};

const deployStages: DeployStage[] = [
  {
    id: 'validation',
    title: 'Contract Validation',
    description: 'Validating smart contract code and dependencies',
    icon: Settings,
    duration: 2000,
    status: 'pending'
  },
  {
    id: 'compilation',
    title: 'Compilation',
    description: 'Compiling Rust code to Solana bytecode',
    icon: Settings,
    duration: 3000,
    status: 'pending'
  },
  {
    id: 'upload',
    title: 'Uploading to Network',
    description: 'Uploading bytecode to Solana blockchain',
    icon: Upload,
    duration: 4000,
    status: 'pending'
  },
  {
    id: 'deployment',
    title: 'Deployment',
    description: 'Deploying and initializing smart contract',
    icon: Rocket,
    duration: 3000,
    status: 'pending'
  },
  {
    id: 'verification',
    title: 'Verification',
    description: 'Verifying deployment and generating contract address',
    icon: CheckCircle,
    duration: 2000,
    status: 'pending'
  }
];

export const DeployModal = ({ isOpen, onClose, onComplete, contractCode, network }: DeployModalProps) => {
  const [stages, setStages] = useState<DeployStage[]>(deployStages);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [deploymentStatus, setDeploymentStatus] = useState<'deploying' | 'success' | 'error'>('deploying');
  const [contractAddress, setContractAddress] = useState('');
  const [transactionHash, setTransactionHash] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset states when modal closes
      setStages(deployStages.map(stage => ({ ...stage, status: 'pending' })));
      setCurrentStageIndex(0);
      setDeploymentStatus('deploying');
      setContractAddress('');
      setTransactionHash('');
      return;
    }

    // Start deployment process
    let timeoutId: NodeJS.Timeout;
    
    if (currentStageIndex < stages.length && deploymentStatus === 'deploying') {
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
          setDeploymentStatus('success');
          setContractAddress('7xKgF8Mz9QW4NLcv6BsxR3Hp2V1dU9tY5eA3fN6jM8sL');
          setTransactionHash('3K7mP9xQ2wV8nF1dG5eR4tY6uI0oL7jH9sA2bC4zX8vN');
          // Call onComplete if provided
          onComplete?.();
        } else {
          setCurrentStageIndex(prev => prev + 1);
        }
      }, Math.max(currentStage.duration * 0.5, 500)); // Speed up by 2x, minimum 500ms
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, currentStageIndex, stages.length, deploymentStatus]);

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'active': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const getStageIcon = (stage: DeployStage) => {
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
                <Rocket className="w-5 h-5 text-orange-500" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Deploy Smart Contract</h2>
                  <p className="text-xs text-gray-400">Deploying to Solana {network}</p>
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
              {deploymentStatus === 'deploying' && (
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
                    <h3 className="text-white font-medium text-xs">Deployment Progress</h3>
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

              {deploymentStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4"
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
                      Deployment Successful!
                    </h3>
                    <p className="text-gray-400 text-xs">
                      Contract deployed to Solana {network}
                    </p>
                  </div>

                  <div className="bg-[#191919] rounded-lg p-3 space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Contract Address
                      </label>
                      <div className="flex items-center gap-2 p-2 bg-[#0A0A0A] rounded border border-[#333]">
                        <code className="flex-1 text-xs text-white font-mono break-all">
                          {contractAddress}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(contractAddress)}
                          className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Transaction Hash
                      </label>
                      <div className="flex items-center gap-2 p-2 bg-[#0A0A0A] rounded border border-[#333]">
                        <code className="flex-1 text-xs text-white font-mono break-all">
                          {transactionHash}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(transactionHash)}
                          className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => window.open(`https://explorer.solana.com/address/${contractAddress}?cluster=${network}`, '_blank')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      View on Explorer
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-3 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

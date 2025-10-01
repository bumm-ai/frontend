import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import creditService, { CreditBalance, CreditRates, CreditTransaction } from '@/services/creditService';

export const useCredits = () => {
  const { connected, publicKey } = useWallet();
  const [balance, setBalance] = useState<CreditBalance>({
    balance: 0,
    totalPurchased: 0,
    totalSpent: 0,
    updatedAt: new Date().toISOString()
  });
  const [rates, setRates] = useState<CreditRates>({
    SOL: 100,
    USDC: 1.0,
    CREDIT: 0.01
  });
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get userId from localStorage or generate
  const getUserId = useCallback((): string => {
    let userId = localStorage.getItem('bumm_user_uid');
    if (!userId && publicKey) {
      userId = publicKey.toString();
      localStorage.setItem('bumm_user_uid', userId);
    }
    return userId || 'anonymous';
  }, [publicKey]);

  // Load credit balance (temporarily disabled - frontend only)
  const loadBalance = useCallback(async () => {
    if (!connected || !publicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      // Temporarily use only local data
      const userId = getUserId();
      const localBalance = localStorage.getItem(`credits_${userId}`);
      
      if (localBalance) {
        setBalance(JSON.parse(localBalance));
      } else {
        // Set initial balance
        const initialBalance = {
          balance: 1000, // Initial credits
          totalPurchased: 1000,
          totalSpent: 0,
          updatedAt: new Date().toISOString()
        };
        setBalance(initialBalance);
        localStorage.setItem(`credits_${userId}`, JSON.stringify(initialBalance));
      }
    } catch (err) {
      console.error('Failed to load credit balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, getUserId]);

  // Load rates (temporarily disabled - frontend only)
  const loadRates = useCallback(async () => {
    try {
      // Use static rates
      const staticRates = {
        SOL: 100,
        USDC: 1.0,
        CREDIT: 0.01
      };
      setRates(staticRates);
    } catch (err) {
      console.error('Failed to load rates:', err);
    }
  }, []);

  // Load operation pricing (temporarily disabled - frontend only)
  const loadPricing = useCallback(async () => {
    try {
      // Use static pricing
      const staticPricing = {
        generate: 100,
        audit: 50,
        build: 25,
        deploy: 75,
        chat: 0.1,
        upgrade: 150
      };
      setPricing(staticPricing);
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
  }, []);

  // Purchase credits (temporarily disabled - frontend only)
  const purchaseCredits = useCallback(async (
    tokenAmount: number,
    tokenType: 'SOL' | 'USDC',
    wallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> }
  ): Promise<void> => {
    if (!connected || !publicKey || !wallet) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Temporarily simulate purchase only on frontend
      const userId = getUserId();
      const creditsToAdd = tokenType === 'SOL' ? tokenAmount * 100 : tokenAmount * 1;
      
      // Update local balance
      const currentBalance = balance.balance + creditsToAdd;
      const newBalance = {
        ...balance,
        balance: currentBalance,
        totalPurchased: balance.totalPurchased + creditsToAdd,
        updatedAt: new Date().toISOString()
      };
      
      setBalance(newBalance);
      localStorage.setItem(`credits_${userId}`, JSON.stringify(newBalance));
      
      console.log(`Simulated purchase: +${creditsToAdd} credits`);
    } catch (err) {
      console.error('Purchase failed:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, getUserId, balance]);

  // Deduct credits for operation (temporarily disabled - frontend only)
  const spendCredits = useCallback(async (
    operationType: 'generate' | 'audit' | 'build' | 'deploy' | 'chat' | 'upgrade',
    bummId?: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> => {
    if (!connected || !publicKey) return true; // Skip if wallet not connected

    try {
      // Temporarily simulate deduction only on frontend
      const userId = getUserId();
      const cost = pricing[operationType] || 0;
      
      if (balance.balance >= cost) {
        const newBalance = {
          ...balance,
          balance: balance.balance - cost,
          totalSpent: balance.totalSpent + cost,
          updatedAt: new Date().toISOString()
        };
        
        setBalance(newBalance);
        localStorage.setItem(`credits_${userId}`, JSON.stringify(newBalance));
        
        console.log(`Simulated spend: -${cost} credits for ${operationType}`);
        return true;
      } else {
        console.log(`Insufficient credits: need ${cost}, have ${balance.balance}`);
        return false;
      }
    } catch (err) {
      console.error('Failed to spend credits:', err);
      return false;
    }
  }, [connected, publicKey, getUserId, balance, pricing]);

  // Calculate operation cost
  const getOperationCost = useCallback((operationType: string): number => {
    return pricing[operationType] || 0;
  }, [pricing]);

  // Check sufficient funds
  const hasEnoughCredits = useCallback((operationType: string): boolean => {
    const cost = getOperationCost(operationType);
    return balance.balance >= cost;
  }, [balance.balance, getOperationCost]);

  // Calculate credits for tokens (temporarily disabled - frontend only)
  const calculateCreditsForTokens = useCallback(async (
    tokenAmount: number,
    tokenType: 'SOL' | 'USDC'
  ): Promise<{
    creditsAmount: number;
    usdAmount: number;
    rates: CreditRates;
  }> => {
    try {
      // Local credit calculation
      const creditsAmount = tokenType === 'SOL' 
        ? tokenAmount * rates.SOL 
        : tokenAmount * rates.USDC;
      
      const usdAmount = tokenType === 'SOL' 
        ? tokenAmount * 100 // Approximate SOL price in USD
        : tokenAmount;
      
      return {
        creditsAmount,
        usdAmount,
        rates
      };
    } catch (err) {
      console.error('Failed to calculate credits:', err);
      return {
        creditsAmount: 0,
        usdAmount: 0,
        rates
      };
    }
  }, [rates]);

  // Load data when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      loadBalance();
      loadRates();
      loadPricing();
    }
  }, [connected, publicKey, loadBalance, loadRates, loadPricing]);

  return {
    balance,
    rates,
    pricing,
    isLoading,
    error,
    loadBalance,
    loadRates,
    loadPricing,
    purchaseCredits,
    spendCredits,
    getOperationCost,
    hasEnoughCredits,
    calculateCreditsForTokens
  };
};

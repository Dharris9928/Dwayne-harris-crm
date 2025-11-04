import { useState, useEffect } from 'react';

const IMPERSONATION_KEY = 'admin-impersonation';
const IMPERSONATION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export interface ImpersonationData {
  userId: string;
  userEmail: string;
  userRole: string;
  expiresAt: number;
}

export function useImpersonation() {
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored) as ImpersonationData;
      
      // Check if impersonation session has expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        sessionStorage.removeItem(IMPERSONATION_KEY);
        return null;
      }
      
      return data;
    } catch {
      sessionStorage.removeItem(IMPERSONATION_KEY);
      return null;
    }
  });

  const startImpersonation = (data: Omit<ImpersonationData, 'expiresAt'>) => {
    const impersonationData: ImpersonationData = {
      ...data,
      expiresAt: Date.now() + IMPERSONATION_EXPIRY_MS
    };
    
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonationData));
    setImpersonation(impersonationData);
    
    console.log(`[Impersonation] Started session for ${data.userEmail}, expires at ${new Date(impersonationData.expiresAt).toISOString()}`);
    
    // Reload to apply impersonation across all hooks
    window.location.reload();
  };

  const stopImpersonation = () => {
    console.log('[Impersonation] Stopping impersonation session');
    sessionStorage.removeItem(IMPERSONATION_KEY);
    setImpersonation(null);
    // Reload to clear impersonation
    window.location.reload();
  };
  
  // Check for expiration periodically
  useEffect(() => {
    if (!impersonation) return;
    
    const checkExpiration = () => {
      if (impersonation.expiresAt && Date.now() > impersonation.expiresAt) {
        console.log('[Impersonation] Session expired, clearing');
        sessionStorage.removeItem(IMPERSONATION_KEY);
        setImpersonation(null);
        window.location.reload();
      }
    };
    
    // Check every minute
    const interval = setInterval(checkExpiration, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [impersonation]);

  const isImpersonating = impersonation !== null;

  return {
    impersonation,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
  };
}

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export function useEconomy() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestPayout = async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const payoutFn = httpsCallable(functions, 'requestPayout');
      const response = await payoutFn();
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const buyPackage = async (packageId) => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const createPaymentFn = httpsCallable(functions, 'createPaymentIntent');
      const response = await createPaymentFn({ packageId });
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const subscribePro = async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const createSubFn = httpsCallable(functions, 'createSubscriptionCheckout');
      const response = await createSubFn();
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const createConnectAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const connectFn = httpsCallable(functions, 'createConnectAccount');
      const response = await connectFn();
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const checkStripeStatus = async () => {
    try {
      const functions = getFunctions();
      const checkFn = httpsCallable(functions, 'checkStripeAccountStatus');
      const response = await checkFn();
      return response.data;
    } catch (err) {
      console.error("Error checking stripe status", err);
    }
  };

  return {
    loading,
    error,
    requestPayout,
    buyPackage,
    subscribePro,
    createConnectAccount,
    checkStripeStatus
  };
}

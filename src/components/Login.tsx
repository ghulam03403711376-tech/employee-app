import React, { useState, useEffect, useRef } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Store, Mail, Lock, AlertCircle, Loader2, ArrowLeft, CheckCircle2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../lib/firebaseService';
import { cn as cx } from '../lib/utils';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'verify' | 'phone_code'>(
    auth.currentUser && auth.currentUser.email && !auth.currentUser.emailVerified && !auth.currentUser.phoneNumber ? 'verify' : 'login'
  );
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownTimer.current = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, [resendCooldown]);

  useEffect(() => {
    if (mode === 'verify' && auth.currentUser) {
      checkInterval.current = setInterval(async () => {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            await auth.currentUser.getIdToken(true); // Force token refresh to include email_verified: true claim
            await firebaseService.updateEmployee(auth.currentUser.uid, { isEmailVerified: true });
            window.location.reload();
          }
        }
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [mode]);

  const setUpRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      setUpRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setMode('phone_code');
    } catch (err: any) {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setError(null);
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      const empInfo = await firebaseService.getEmployee(user.uid);
      if (!empInfo) {
        await firebaseService.addEmployee(user.uid, {
          name: name || 'New Phone User',
          email: phoneNumber, // store phone number in email field as placeholder
          role: 'Employee',
          salaryType: 'Monthly',
          salaryAmount: 0,
          commissionPercentage: 0,
          leavePolicy: 'None',
          lateAllowanceMinutes: 120,
          isMealAllowanceEligible: true,
          joinDate: new Date().toISOString().split('T')[0],
          isActive: true,
          isEmailVerified: true // phone verified
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login' && loginMethod === 'email') {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        if (!user.emailVerified) {
          setMode('verify');
        }
      } else if (mode === 'signup') {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(user);
        await firebaseService.addEmployee(user.uid, {
          name,
          email,
          role: 'Employee',
          salaryType: 'Monthly',
          salaryAmount: 0,
          commissionPercentage: 0,
          leavePolicy: 'None',
          lateAllowanceMinutes: 120,
          isMealAllowanceEligible: true,
          joinDate: new Date().toISOString().split('T')[0],
          isActive: true,
          isEmailVerified: false
        });
        setMode('verify');
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (auth.currentUser && resendCooldown === 0) {
      try {
        setLoading(true);
        await sendEmailVerification(auth.currentUser);
        setError(null);
        setResendCooldown(60); // 60 seconds cooldown
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl w-full max-w-md border dark:border-slate-800"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-600 p-3 rounded-2xl">
            <Store className="text-white w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-center mb-2 tracking-tight">RetailFlow Pro</h1>
        
        <p className="text-slate-500 text-center mb-8">
          {mode === 'login' ? 'Sign in to your account' : 
           mode === 'signup' ? 'Apply for employee account' : 
           mode === 'verify' ? 'Verify your identity' :
           'Reset your password'}
        </p>

        {mode === 'verify' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <Mail className="w-16 h-16 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold">Verify your email</h3>
            <p className="text-sm text-slate-500">
              We've sent a verification link to your email. Please click the link to activate your account.
            </p>
            <div className="pt-4 space-y-3">
              <button 
                onClick={async () => {
                  if (auth.currentUser) {
                    setLoading(true);
                    try {
                      await auth.currentUser.reload();
                      if (auth.currentUser.emailVerified) {
                        await auth.currentUser.getIdToken(true); // Ensure claims are updated
                        await firebaseService.updateEmployee(auth.currentUser.uid, { isEmailVerified: true });
                        window.location.reload();
                      } else {
                        setError("Your email is not verified yet. Please check your inbox and click the link.");
                      }
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {loading && mode === 'verify' && <Loader2 className="w-4 h-4 animate-spin" />}
                I've verified my email
              </button>
              <button 
                onClick={handleResendVerification}
                disabled={loading || resendCooldown > 0}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
              </button>
              {resendCooldown > 55 && (
                <p className="text-xs text-emerald-600 font-medium animate-pulse">
                  Verification email sent successfully!
                </p>
              )}
              <button 
                onClick={() => { auth.signOut(); setMode('login'); }}
                className="w-full py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </motion.div>
        ) : mode === 'forgot' && resetSent ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold">Email Sent!</h3>
            <p className="text-sm text-slate-500">
              Check your inbox at <strong>{email}</strong> for instructions to reset your password.
            </p>
            <button 
              onClick={() => { setMode('login'); setResetSent(false); }}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Back to Login
            </button>
          </motion.div>
        ) : mode === 'phone_code' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <Mail className="w-16 h-16 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold">Enter Verification Code</h3>
            <p className="text-sm text-slate-500">
              We've sent a text message to <strong>{phoneNumber}</strong> with a verification code.
            </p>
            <form onSubmit={verifyOTP} className="space-y-4 pt-4">
              <input 
                required
                type="text"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                className="w-full px-4 py-3 text-center tracking-[0.5em] text-lg rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                placeholder="000000"
              />
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
              </button>
              <button 
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Back to Login
              </button>
            </form>
          </motion.div>
        ) : (
          <form onSubmit={loginMethod === 'phone' && (mode === 'login' || mode === 'signup') ? handlePhoneLogin : handleSubmit} className="space-y-4">
            
            {(mode === 'login' || mode === 'signup') && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={cx(
                    "flex-1 py-1.5 text-sm font-bold rounded-lg transition-all",
                    loginMethod === 'email' ? "bg-white dark:bg-slate-700 shadow text-emerald-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={cx(
                    "flex-1 py-1.5 text-sm font-bold rounded-lg transition-all",
                    loginMethod === 'phone' ? "bg-white dark:bg-slate-700 shadow text-emerald-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  Phone Number
                </button>
              </div>
            )}
            
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">Full Name</label>
                  <input 
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                    placeholder="John Doe"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {loginMethod === 'email' || mode === 'forgot' ? (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    required
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            )}

            {(mode !== 'forgot' && loginMethod === 'email') && (
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                  <button 
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              id="sign-in-button"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
               (mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link')}
            </button>

            <div id="recaptcha-container"></div>

            {mode === 'forgot' && (
              <button 
                type="button"
                onClick={() => setMode('login')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            )}
          </form>
        )}

        <div className="mt-8 text-center border-t dark:border-slate-800 pt-6">
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className={cx(
              "text-sm font-bold transition-colors",
              mode === 'forgot' ? "hidden" : "text-emerald-600 hover:text-emerald-700"
            )}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

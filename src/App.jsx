import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GatewayProvider } from './contexts/GatewayContext';
import AppShell from './components/layout/AppShell';
import CheckpointModal from './components/security/CheckpointModal';
import RequireAuth from './components/auth/guards/RequireAuth';

// Auth routes
const SignIn = lazy(() => import('./screens/auth/SignIn'));
const SignUp = lazy(() => import('./screens/auth/SignUp'));
const ForgotPassword = lazy(() => import('./screens/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./screens/auth/ResetPassword'));
const AuthCallback = lazy(() => import('./screens/auth/AuthCallback'));

// Protected routes

const Dashboard = lazy(() => import('./screens/Dashboard'));
const Agents = lazy(() => import('./screens/Agents'));
const Builder = lazy(() => import('./screens/Builder'));
const Tasks = lazy(() => import('./screens/Tasks'));
const Skills = lazy(() => import('./screens/Skills'));
const Memory = lazy(() => import('./screens/Memory'));
const Settings = lazy(() => import('./screens/Settings'));
const Onboarding = lazy(() => import('./screens/Onboarding'));

function PageFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-tertiary)',
      }}
    >
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <GatewayProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected App Routes (Require Authentication) */}
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/builder" element={<Builder />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/skills" element={<Skills />} />
                <Route path="/memory" element={<Memory />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/onboarding" element={<Onboarding />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
        <CheckpointModal />
      </GatewayProvider>
    </HashRouter>
  );
}

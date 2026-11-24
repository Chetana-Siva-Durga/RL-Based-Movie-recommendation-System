import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { Pages, mainPage } = pagesConfig;
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];

  useEffect(() => {
    if (!isAuthenticated) return;

    const pathname = location.pathname;
    if (pathname === '/' || pathname === '') {
      void mainPageKey;
    } else {
      const pathSegment = pathname.replace(/^\//, '').split('/')[0];
      const pageKeys = Object.keys(Pages);
      pageKeys.find(
        key => key.toLowerCase() === pathSegment.toLowerCase()
      );
    }
  }, [location, isAuthenticated, Pages, mainPageKey]);

  return null;
}
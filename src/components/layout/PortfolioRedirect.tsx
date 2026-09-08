import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { portfolioDestination } from '@/portfolio-route';

/** Leave the CMS bundle when its navigation opens a public portfolio route. */
export default function PortfolioRedirect() {
  const { pathname, search, hash } = useLocation();
  const destination = portfolioDestination(pathname, search, hash) || '/';
  useEffect(() => { window.location.replace(destination); }, [destination]);
  return <a href={destination}>Open portfolio</a>;
}


import { portfolioDestination } from './portfolio-route';

const destination = portfolioDestination(location.pathname, location.search, location.hash);

if (destination !== null) {
  if (destination !== `${location.pathname}${location.search}${location.hash}`) {
    history.replaceState(history.state, '', destination);
  }
  void import('./concepts/practice/main');
} else {
  // Keep the existing CMS, sign-in, and content routes in their own style bundle.
  void import('./legacy-main');
}

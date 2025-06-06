
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-medium tracking-tight">
          Will Dzierson / Portfolio
        </Link>
      </div>
    </header>
  );
};

export default Header;

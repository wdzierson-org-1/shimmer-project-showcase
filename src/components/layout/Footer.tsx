
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="mt-24 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 flex items-center justify-between">
        <Link
          to="/"
          className="font-serif text-sm text-foreground/30 hover:text-foreground/60 transition-colors no-underline"
          style={{ fontWeight: 200 }}
        >
          William Dzierson
        </Link>
        <p className="text-xs font-sans text-foreground/25">
          © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
};

export default Footer;

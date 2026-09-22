
import React from 'react';
import { Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="py-8 mt-16 border-t">
      <div className="container mx-auto px-4 md:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground font-light">
          Will Dzierson
        </p>
        <div className="flex items-center gap-5">
          <a
            href="mailto:will+hello@dzierson.com"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail size={14} />
            <span>will+hello@dzierson.com</span>
          </a>
          <a
            href="https://www.linkedin.com/in/will-dzierson-1081963/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin size={16} />
          </a>
          <a
            href="https://github.com/wdzierson/shimmer-project-showcase-pub"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

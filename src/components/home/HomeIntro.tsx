
import React from 'react';

const HomeIntro = () => {
  return (
    <div className="space-y-6 text-muted-foreground">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed">
          Will Depue is a Brooklyn-based product designer with experience in software companies ranging from early stage startups to large corporations.
        </p>
        
        <p className="text-sm leading-relaxed text-muted-foreground/80 italic">
          This is not a replication of Will. It's just an assistant.
        </p>
        
        <p className="text-sm leading-relaxed">
          He thrives at the intersection of business strategy, user experience, and technology, with a passion for building products that are both beautiful and functional.
        </p>
        
        <p className="text-sm leading-relaxed">
          Currently, he is focused on AI/ML interpretability and safety at Anthropic, where he leads design for the alignment science team.
        </p>
      </div>
    </div>
  );
};

export default HomeIntro;

import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PublicContentList from '@/components/content/PublicContentList';

const AllEntries = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-8">
            <h1 className="text-3xl font-serif tracking-tight mb-2" style={{ fontWeight: 200 }}>All Entries</h1>
            <p className="text-muted-foreground">Content, insights, and creative documentation</p>
          </div>
          
          <PublicContentList />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AllEntries;
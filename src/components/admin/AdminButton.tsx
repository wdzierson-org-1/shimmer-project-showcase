
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const AdminButton = () => {
  const { user } = useAuth();
  
  return (
    <Button asChild variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm border-border/30 hover:bg-background/60 mono">
      <Link to={user ? "/admin" : "/login"}>
        Admin Portal
      </Link>
    </Button>
  );
};

export default AdminButton;

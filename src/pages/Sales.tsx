import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy Sales page - redirects to /sales-v2
 * All sales creation must go through the createSaleV2 action only.
 */
export default function Sales() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/sales-v2', { replace: true });
  }, [navigate]);
  
  return null;
}
